using MechanicShop.Application.Common.Errors;
using MechanicShop.Application.Common.Interfaces;
using MechanicShop.Domain.Common.Results;
using MechanicShop.Domain.Workorders.Events;

using MediatR;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Logging;

namespace MechanicShop.Application.Features.WorkOrders.Commands.RelocateWorkOrder;

public class RelocateWorkOrderCommandHandler(
    ILogger<RelocateWorkOrderCommandHandler> logger,
    IAppDbContext context,
    HybridCache cache,
    IWorkOrderPolicy WorkOrderValidator
    )
    : IRequestHandler<RelocateWorkOrderCommand, Result<Updated>>
{
    private readonly ILogger<RelocateWorkOrderCommandHandler> _logger = logger;
    private readonly IAppDbContext _context = context;
    private readonly HybridCache _cache = cache;
    private readonly IWorkOrderPolicy _appointmentValidator = WorkOrderValidator;

    public async Task<Result<Updated>> Handle(RelocateWorkOrderCommand command, CancellationToken ct)
    {
        var workOrder = await _context.WorkOrders
            .Include(a => a.RepairTasks)
            .Include(a => a.Labor)
            .Include(a => a.Vehicle)
            .FirstOrDefaultAsync(a => a.Id == command.WorkOrderId, ct);

        if (workOrder is null)
        {
            _logger.LogWarning("WorkOrder relocation rejected because WorkOrder {WorkOrderId} was not found", command.WorkOrderId);

            return ApplicationErrors.WorkOrderNotFound;
        }

        var duration = workOrder.EndAtUtc.Subtract(workOrder.StartAtUtc).Duration();

        var endAt = command.NewStartAt.Add(duration);

        var checkSpotAvailabilityResult = await _appointmentValidator.CheckSpotAvailabilityAsync(
            workOrder.Spot,
            command.NewStartAt,
            endAt,
            excludeWorkOrderId: workOrder.Id,
            ct);

        if (checkSpotAvailabilityResult.IsError)
        {
            _logger.LogWarning("WorkOrder relocation rejected because spot {Spot} is not available", workOrder.Spot);

            return checkSpotAvailabilityResult.Errors;
        }

        if (await _appointmentValidator.IsLaborOccupied(workOrder.LaborId, command.WorkOrderId, command.NewStartAt, endAt))
        {
            _logger.LogWarning("WorkOrder relocation rejected because labor {LaborId} is already occupied", workOrder.LaborId);

            return ApplicationErrors.LaborOccupied;
        }

        if (await _appointmentValidator.IsVehicleAlreadyScheduled(workOrder.VehicleId, command.NewStartAt, endAt, command.WorkOrderId))
        {
            _logger.LogWarning("WorkOrder relocation rejected because vehicle {VehicleId} has an overlapping WorkOrder", workOrder.VehicleId);

            return ApplicationErrors.VehicleSchedulingConflict;
        }

        var updateTimingResult = workOrder.UpdateTiming(command.NewStartAt, endAt);

        if (updateTimingResult.IsError)
        {
            _logger.LogWarning(
                "WorkOrder relocation rejected for WorkOrder {WorkOrderId}: {ErrorDescription}",
                command.WorkOrderId,
                updateTimingResult.TopError.Description);

            return updateTimingResult.Errors;
        }

        var updateSpotResult = workOrder.UpdateSpot(command.NewSpot);

        if (updateSpotResult.IsError)
        {
            _logger.LogWarning(
                "WorkOrder relocation rejected for WorkOrder {WorkOrderId}: {ErrorDescription}",
                command.WorkOrderId,
                updateSpotResult.TopError.Description);

            return updateSpotResult.Errors;
        }

        workOrder.AddDomainEvent(new WorkOrderCollectionModified());

        await _context.SaveChangesAsync(ct);

        await _cache.RemoveByTagAsync("work-order", ct);

        _logger.LogInformation(
            "WorkOrder {WorkOrderId} relocated to {StartAtUtc} and spot {Spot} successfully",
            command.WorkOrderId,
            command.NewStartAt,
            command.NewSpot);

        return Result.Updated;
    }
}
