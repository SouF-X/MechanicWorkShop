using MechanicShop.Application.Common.Errors;
using MechanicShop.Application.Common.Interfaces;
using MechanicShop.Domain.Common.Results;
using MechanicShop.Domain.RepairTasks;
using MechanicShop.Domain.Workorders.Events;

using MediatR;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Logging;

namespace MechanicShop.Application.Features.WorkOrders.Commands.UpdateWorkOrderRepairTasks;

public class UpdateWorkOrderRepairTasksCommandHandler(
    ILogger<UpdateWorkOrderRepairTasksCommandHandler> logger,
    IAppDbContext context,
    HybridCache cache,
    IWorkOrderPolicy workOrderValidator)
    : IRequestHandler<UpdateWorkOrderRepairTasksCommand, Result<Updated>>
{
    public async Task<Result<Updated>> Handle(UpdateWorkOrderRepairTasksCommand command, CancellationToken ct)
    {
        var workOrder = await context.WorkOrders
            .Include(w => w.RepairTasks)
            .FirstOrDefaultAsync(w => w.Id == command.WorkOrderId, ct);

        if (workOrder is null)
        {
            logger.LogWarning("Repair task update rejected because WorkOrder {WorkOrderId} was not found", command.WorkOrderId);

            return ApplicationErrors.WorkOrderNotFound;
        }

        if (command.RepairTaskIds.Length == 0)
        {
            logger.LogWarning("Repair task update rejected because no RepairTaskIds were submitted for WorkOrder {WorkOrderId}", command.WorkOrderId);

            return RepairTaskErrors.AtLeastOneRepairTaskIsRequired;
        }

        var requestedTasks = await context.RepairTasks
            .Where(t => command.RepairTaskIds.Contains(t.Id))
            .ToListAsync(ct);

        if (requestedTasks.Count != command.RepairTaskIds.Length)
        {
            var missingIds = command.RepairTaskIds.Except(requestedTasks.Select(t => t.Id)).ToArray();

            logger.LogWarning("Repair task update rejected because RepairTaskIds were not found: {MissingIds}", string.Join(", ", missingIds));

            return ApplicationErrors.RepairTaskNotFound;
        }

        var replaceRepairTasksResult = workOrder.ReplaceRepairTasks(requestedTasks);

        if (replaceRepairTasksResult.IsError)
        {
            logger.LogWarning(
                "Repair task update rejected for WorkOrder {WorkOrderId}: {ErrorDescription}",
                command.WorkOrderId,
                replaceRepairTasksResult.TopError.Description);

            return replaceRepairTasksResult;
        }

        var totalDuration = TimeSpan.FromMinutes(requestedTasks.Sum(x => (int)x.EstimatedDurationInMins));

        var newEndAt = workOrder.StartAtUtc + totalDuration;

        // Business validations
        if (workOrderValidator.IsOutsideOperatingHours(workOrder.StartAtUtc, totalDuration))
        {
            logger.LogWarning("Repair task update rejected because WorkOrder {WorkOrderId} would exceed operating hours", command.WorkOrderId);

            return Error.Conflict("WorkOrder_Outside_OperatingHours", "WorkOrder timing exceeds business hours.");
        }

        var spotCheckResult = await workOrderValidator.CheckSpotAvailabilityAsync(
            workOrder.Spot,
            workOrder.StartAtUtc,
            newEndAt,
            excludeWorkOrderId: workOrder.Id,
            ct: ct);

        if (spotCheckResult.IsError)
        {
            logger.LogWarning("Repair task update rejected because spot {Spot} is not available for WorkOrder {WorkOrderId}", workOrder.Spot, command.WorkOrderId);

            return spotCheckResult.Errors;
        }

        if (await workOrderValidator.IsLaborOccupied(workOrder.LaborId, workOrder.Id, workOrder.StartAtUtc, newEndAt))
        {
            logger.LogWarning("Repair task update rejected because labor {LaborId} is occupied for WorkOrder {WorkOrderId}", workOrder.LaborId, command.WorkOrderId);

            return ApplicationErrors.LaborOccupied;
        }

        workOrder.UpdateTiming(workOrder.StartAtUtc, newEndAt);

        workOrder.AddDomainEvent(new WorkOrderCollectionModified());

        await context.SaveChangesAsync(ct);

        await cache.RemoveByTagAsync("work-order", ct);

        logger.LogInformation("Repair tasks updated for WorkOrder {WorkOrderId} successfully", command.WorkOrderId);

        return Result.Updated;
    }
}
