using MechanicShop.Application.Common.Errors;
using MechanicShop.Application.Common.Interfaces;
using MechanicShop.Domain.Common.Results;
using MechanicShop.Domain.Employees;
using MechanicShop.Domain.Identity;
using MechanicShop.Domain.Workorders.Events;

using MediatR;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Logging;

namespace MechanicShop.Application.Features.WorkOrders.Commands.AssignLabor;

public class AssignLaborCommandHandler(
    ILogger<AssignLaborCommandHandler> logger,
    IAppDbContext context,
    HybridCache cache,
    IWorkOrderPolicy WorkOrderRuleService
    )
    : IRequestHandler<AssignLaborCommand, Result<Updated>>
{
    private readonly ILogger<AssignLaborCommandHandler> _logger = logger;
    private readonly IAppDbContext _context = context;
    private readonly HybridCache _cache = cache;
    private readonly IWorkOrderPolicy _workOrderValidator = WorkOrderRuleService;

    public async Task<Result<Updated>> Handle(AssignLaborCommand command, CancellationToken ct)
    {
        var workOrder = await _context.WorkOrders
            .FirstOrDefaultAsync(a => a.Id == command.WorkOrderId, ct);

        if (workOrder is null)
        {
            _logger.LogWarning("Labor assignment rejected because WorkOrder {WorkOrderId} was not found", command.WorkOrderId);

            return ApplicationErrors.WorkOrderNotFound;
        }

        var labor = await _context.Employees.FindAsync([command.LaborId], ct);

        if (labor is null)
        {
            _logger.LogWarning("Labor assignment rejected because labor {LaborId} was not found", command.LaborId);

            return ApplicationErrors.LaborNotFound;
        }

        if (labor.Role != Role.Labor || !labor.IsActive)
        {
            _logger.LogWarning(
                "Labor assignment rejected because employee {LaborId} is not an active laborer",
                command.LaborId);

            return ApplicationErrors.LaborNotAssignable;
        }

        if (await _workOrderValidator.IsLaborOccupied(command.LaborId, command.WorkOrderId, workOrder.StartAtUtc, workOrder.EndAtUtc))
        {
            _logger.LogWarning("Labor assignment rejected because labor {LaborId} is already occupied", command.LaborId);

            return ApplicationErrors.LaborOccupied;
        }

        var updateLaborResult = workOrder.UpdateLabor(command.LaborId);

        if (updateLaborResult.IsError)
        {
            foreach (var error in updateLaborResult.Errors)
            {
                _logger.LogWarning(
                    "Labor assignment rejected for WorkOrder {WorkOrderId}: {ErrorCode} - {ErrorDescription}",
                    command.WorkOrderId,
                    error.Code,
                    error.Description);
            }

            return updateLaborResult.Errors;
        }

        workOrder.AddDomainEvent(new WorkOrderCollectionModified());

        await _context.SaveChangesAsync(ct);

        await _cache.RemoveByTagAsync("work-order", ct);

        _logger.LogInformation(
            "Labor {LaborId} assigned to WorkOrder {WorkOrderId} successfully",
            command.LaborId,
            command.WorkOrderId);

        return Result.Updated;
    }
}
