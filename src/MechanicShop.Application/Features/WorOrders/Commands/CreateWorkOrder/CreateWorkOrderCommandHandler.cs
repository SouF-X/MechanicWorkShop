using MechanicShop.Application.Common.Errors;
using MechanicShop.Application.Common.Interfaces;
using MechanicShop.Application.Features.WorkOrders.Dtos;
using MechanicShop.Application.Features.WorkOrders.Mappers;
using MechanicShop.Domain.Common.Results;
using MechanicShop.Domain.Identity;
using MechanicShop.Domain.RepairTasks;
using MechanicShop.Domain.Workorders;
using MechanicShop.Domain.Workorders.Enums;
using MechanicShop.Domain.Workorders.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Logging;

namespace MechanicShop.Application.Features.WorkOrders.Commands.CreateWorkOrder;

public class CreateWorkOrderCommandHandler(
    ILogger<CreateWorkOrderCommandHandler> logger,
    IAppDbContext context,
    HybridCache cache,
    IWorkOrderPolicy workOrderValidator
    )
    : IRequestHandler<CreateWorkOrderCommand, Result<WorkOrderDto>>
{
    private readonly ILogger<CreateWorkOrderCommandHandler> _logger = logger;
    private readonly IAppDbContext _context = context;
    private readonly HybridCache _cache = cache;
    private readonly IWorkOrderPolicy _workOrderPolicy = workOrderValidator;

    public async Task<Result<WorkOrderDto>> Handle(CreateWorkOrderCommand command, CancellationToken ct)
    {
        var repairTasks = await _context.RepairTasks
                                .Where(t => command.RepairTaskIds.Contains(t.Id))
                                .ToListAsync(ct);

        if (repairTasks.Count != command.RepairTaskIds.Count)
        {
            var missingIds = command.RepairTaskIds.Except(repairTasks.Select(t => t.Id)).ToArray();

            _logger.LogWarning("WorkOrder creation rejected because RepairTaskIds were not found: {MissingIds}", string.Join(", ", missingIds));

            return ApplicationErrors.RepairTaskNotFound;
        }

        var totalEstimatedDuration = TimeSpan.FromMinutes(repairTasks.Sum(r => (int)r.EstimatedDurationInMins));
        var endAt = command.StartAt.Add(totalEstimatedDuration);

        if (_workOrderPolicy.IsOutsideOperatingHours(command.StartAt, totalEstimatedDuration))
        {
            _logger.LogWarning(
                "WorkOrder creation rejected because time range {StartAt} to {EndAt} is outside operating hours",
                command.StartAt,
                endAt);

            return ApplicationErrors.WorkOrderOutsideOperatingHour(command.StartAt, endAt);
        }

        var checkMinRequirementResult = _workOrderPolicy.ValidateMinimumRequirement(command.StartAt, endAt);

        if (checkMinRequirementResult.IsError)
        {
            _logger.LogWarning("WorkOrder creation rejected because duration is shorter than the configured minimum");

            return checkMinRequirementResult.Errors;
        }
        var checkSpotAvailabilityResult = await _workOrderPolicy.CheckSpotAvailabilityAsync(
            command.Spot,
            command.StartAt,
            endAt,
            excludeWorkOrderId: null,
            ct);

        if (checkSpotAvailabilityResult.IsError)
        {
            _logger.LogWarning("WorkOrder creation rejected because spot {Spot} is not available", command.Spot);

            return checkSpotAvailabilityResult.Errors;
        }

        var vehicle = await _context.Vehicles.Include(v => v.Customer).FirstOrDefaultAsync(v => v.Id == command.VehicleId, cancellationToken: ct);

        if (vehicle is null)
        {
            _logger.LogWarning("WorkOrder creation rejected because vehicle {VehicleId} was not found", command.VehicleId);

            return ApplicationErrors.VehicleNotFound;
        }

        var labor = await _context.Employees.FindAsync([command.LaborId], ct);

        if (labor is null)
        {
            _logger.LogWarning("WorkOrder creation rejected because labor {LaborId} was not found", command.LaborId);

            return ApplicationErrors.LaborNotFound;
        }

        if (labor.Role != Role.Labor || !labor.IsActive)
        {
            _logger.LogWarning(
                "WorkOrder creation rejected because employee {LaborId} is not an active laborer",
                command.LaborId);

            return ApplicationErrors.LaborNotAssignable;
        }

        var hasVehicleConflict = await _context.WorkOrders
            .AnyAsync(
                a =>
                a.VehicleId == command.VehicleId &&
                (a.State == WorkOrderState.Scheduled || a.State == WorkOrderState.InProgress) &&
                a.StartAtUtc.Date == command.StartAt.Date &&
                a.StartAtUtc < endAt &&
                a.EndAtUtc > command.StartAt,
                ct);

        if (hasVehicleConflict)
        {
            _logger.LogWarning("WorkOrder creation rejected because vehicle {VehicleId} has an overlapping WorkOrder", command.VehicleId);

            return Error.Conflict(
                code: "Vehicle_Overlapping_WorkOrders",
                description: "The vehicle already has an overlapping WorkOrder.");
        }

        var isLaborOccupied = await _context.WorkOrders
            .AnyAsync(
                a =>
                a.LaborId == command.LaborId &&
                (a.State == WorkOrderState.Scheduled || a.State == WorkOrderState.InProgress) &&
                a.StartAtUtc < endAt &&
                a.EndAtUtc > command.StartAt,
                ct);

        if (isLaborOccupied)
        {
            _logger.LogWarning("WorkOrder creation rejected because labor {LaborId} is already occupied", command.LaborId);

            return Error.Conflict(
                code: "Labor_Occupied",
                description: "Labor is already occupied during the requested time.");
        }

        var createWorkOrderResult = WorkOrder.Create(
            Guid.NewGuid(),
            command.VehicleId,
            command.StartAt,
            endAt,
            command.LaborId!.Value,
            command.Spot,
            repairTasks);

        if (createWorkOrderResult.IsError)
        {
            _logger.LogWarning("WorkOrder creation rejected: {ErrorDescription}", createWorkOrderResult.TopError.Description);

            return createWorkOrderResult.Errors;
        }

        var workOrder = createWorkOrderResult.Value;

        _context.WorkOrders.Add(workOrder);

        workOrder.AddDomainEvent(new WorkOrderCollectionModified());

        await _context.SaveChangesAsync(ct);

        workOrder.Vehicle = vehicle;
        workOrder.Labor = labor;

        _logger.LogInformation("WorkOrder {WorkOrderNumber} ({WorkOrderId}) created successfully", workOrder.WorkOrderNumber, workOrder.Id);

        await _cache.RemoveByTagAsync("work-order", ct);

        return workOrder.ToDto();
    }
}
