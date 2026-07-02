using System.Security.Claims;

using Asp.Versioning;
using MechanicShop.Application.Common.Models;
using MechanicShop.Application.Features.Scheduling.Dtos;
using MechanicShop.Application.Features.Scheduling.Queries.GetDailyScheduleQuery;
using MechanicShop.Application.Features.WorkOrders.Commands.AssignLabor;
using MechanicShop.Application.Features.WorkOrders.Commands.CreateWorkOrder;
using MechanicShop.Application.Features.WorkOrders.Commands.DeleteWorkOrder;
using MechanicShop.Application.Features.WorkOrders.Commands.RelocateWorkOrder;
using MechanicShop.Application.Features.WorkOrders.Commands.UpdateOrderState;
using MechanicShop.Application.Features.WorkOrders.Commands.UpdateWorkOrderRepairTasks;
using MechanicShop.Application.Features.WorkOrders.Dtos;
using MechanicShop.Application.Features.WorkOrders.Queries.GetWorkOrderByIdQuery;
using MechanicShop.Application.Features.WorkOrders.Queries.GetWorkOrders;
using MechanicShop.Contracts.Requests.WorkOrders;
using MechanicShop.Domain.Identity;
using MechanicShop.Infrastructure.Settings;
using MechanicShop.Domain.Workorders.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace MechanicShop.Api.Controllers;

[Route("api/v{version:apiVersion}/workorders")]
[ApiVersion("1.0")]
[Authorize]
[EnableRateLimiting("SlidingWindow")]
public sealed class WorkOrdersController(ISender sender, IOptions<AppSettings> options) : ApiController
{
    [HttpGet]
    [ProducesResponseType(typeof(PaginatedList<WorkOrderListItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    [EndpointSummary("Retrieves a paginated list of work orders.")]
    [EndpointDescription(
        "Supports filtering by date range, status, vehicle, labor, spot, and searching by term. Pagination and sorting are supported.")]
    [EndpointName("GetWorkOrders")]
    [MapToApiVersion("1.0")]
    public async Task<IActionResult> Get(
        [FromQuery] WorkOrderFilterRequest filters,
        [FromQuery] PageRequest pageRequest,
        CancellationToken ct)
    {
        if (pageRequest.Page <= 0)
        {
            return BadRequest("Page must be greater than 0");
        }

        if (pageRequest.PageSize <= 0 || pageRequest.PageSize > 100)
        {
            return BadRequest("PageSize must be between 1 and 100");
        }

        var effectiveLaborId = GetEffectiveLaborId(filters.LaborId);

        if (IsLaborOnly() && effectiveLaborId is null)
        {
            return Forbid();
        }

        var query = new GetWorkOrdersQuery(
            pageRequest.Page,
            pageRequest.PageSize,
            filters.SearchTerm,
            filters.SortColumn,
            filters.SortDirection,
            filters.State is not null ? (WorkOrderState)(int)filters.State : null,
            filters.VehicleId,
            effectiveLaborId,
            filters.StartDateFrom,
            filters.StartDateTo,
            filters.EndDateFrom,
            filters.EndDateTo,
            filters.Spot is not null ? (Spot)(int)filters.Spot : null);

        var result = await sender.Send(query, ct);

        return result.Match(response => Ok(response), Problem);
    }

    [HttpGet("{workOrderId:guid}", Name = "GetWorkOrderById")]
    [Authorize(
        Roles = $"{nameof(Role.Manager)},{nameof(Role.Labor)}",
        Policy = "SelfScopedWorkOrderAccess")]
    [ProducesResponseType(typeof(WorkOrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    [EndpointSummary("Retrieves a work order by its ID.")]
    [EndpointDescription("Returns detailed information about the specified work order if it exists.")]
    [EndpointName("GetWorkOrderById")]
    [MapToApiVersion("1.0")]
    public async Task<IActionResult> GetById(Guid workOrderId, CancellationToken ct)
    {
        var result = await sender.Send(new GetWorkOrderByIdQuery(workOrderId), ct);

        return result.Match(
            response => Ok(IsLaborOnly() ? SanitizeForLabor(response) : response),
            Problem);
    }

    [HttpPost]
    [Authorize(Policy = "ManagerOnly")]
    [ProducesResponseType(typeof(WorkOrderDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    [EndpointSummary("Creates a new work order.")]
    [EndpointDescription("Creates a new work order for a vehicle, specifying labor, tasks, and other required information.")]
    [EndpointName("CreateWorkOrder")]
    [MapToApiVersion("1.0")]
    public async Task<IActionResult> Create(
        [FromBody] CreateWorkOrderRequest request,
        CancellationToken ct)
    {
        var result = await sender.Send(
            new CreateWorkOrderCommand(
                (Spot)(int)request.Spot,
                request.VehicleId,
                request.StartAtUtc,
                request.RepairTaskIds,
                request.LaborId),
            ct);

        return result.Match(
            response =>
                CreatedAtRoute(
                    routeName: "GetWorkOrderById",
                    routeValues: new { version = "1.0", workOrderId = response.WorkOrderId },
                    value: response),
            Problem);
    }

    [HttpPut("{workOrderId:guid}/relocation")]
    [Authorize(Policy = "ManagerOnly")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    [EndpointSummary("Relocates a work order to a new time and spot.")]
    [EndpointDescription("Updates the scheduled time and assigned bay for a work order. Only users with the Manager role can perform this action.")]
    [EndpointName("RescheduleWorkOrder")]
    [MapToApiVersion("1.0")]
    public async Task<IActionResult> Relocate(
        Guid workOrderId,
        RelocateWorkOrderRequest request,
        CancellationToken ct)
    {
        var command = new RelocateWorkOrderCommand(
            workOrderId,
            request.NewStartAtUtc,
            (Spot)(int)request.NewSpot);

        var result = await sender.Send(command, ct);

        return result.Match(_ => NoContent(), Problem);
    }

    [HttpPut("{workOrderId:guid}/labor")]
    [Authorize(Policy = "ManagerOnly")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    [EndpointSummary("Assigns a labor to a work order.")]
    [EndpointDescription("Associates a labor definition with a specific work order. Only managers can perform this operation.")]
    [EndpointName("AssignLaborToWorkOrder")]
    [MapToApiVersion("1.0")]
    public async Task<IActionResult> AssignLabor(
        Guid workOrderId,
        AssignLaborRequest request,
        CancellationToken ct)
    {
        var command = new AssignLaborCommand(workOrderId, Guid.Parse(request.LaborId));

        var result = await sender.Send(command, ct);

        return result.Match(_ => NoContent(), Problem);
    }

    [HttpPut("{workOrderId:guid}/state")]
    [Authorize(
        Roles = $"{nameof(Role.Manager)},{nameof(Role.Labor)}",
        Policy = "SelfScopedWorkOrderAccess")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    [EndpointSummary("Changes the state of a work order.")]
    [EndpointDescription("Updates the current state of the specified work order. Managers and authorized labor users can perform this action.")]
    [EndpointName("UpdateWorkOrderState")]
    [MapToApiVersion("1.0")]
    public async Task<IActionResult> UpdateState(
        Guid workOrderId,
        UpdateWorkOrderStateRequest request,
        CancellationToken ct)
    {
        var requestedState = (WorkOrderState)(int)request.State;

        if (IsLaborOnly() && requestedState is not WorkOrderState.InProgress and not WorkOrderState.Completed)
        {
            return Forbid();
        }

        var command = new UpdateWorkOrderStateCommand(
            workOrderId,
            requestedState);

        var result = await sender.Send(command, ct);

        return result.Match(_ => NoContent(), Problem);
    }

    [HttpPut("{workOrderId:guid}/repair-task")]
    [Authorize(Roles = nameof(Role.Manager))]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    [EndpointSummary("Updates the repair tasks associated with a work order.")]
    [EndpointDescription("Replaces the repair tasks associated with the specified work order. Only users with the Manager role can perform this action.")]
    [EndpointName("UpdateWorkOrderRepairTasks")]
    [MapToApiVersion("1.0")]
    public async Task<IActionResult> UpdateRepairTasks(
        Guid workOrderId,
        ModifyRepairTaskRequest request,
        CancellationToken ct)
    {
        var command = new UpdateWorkOrderRepairTasksCommand(workOrderId, request.RepairTaskIds);

        var result = await sender.Send(command, ct);

        return result.Match(_ => NoContent(), Problem);
    }

    [HttpDelete("{workOrderId:guid}")]
    [Authorize(Policy = "ManagerOnly")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    [EndpointSummary("Deletes a work order.")]
    [EndpointDescription("Deletes the specified work order permanently. Only users with the Manager role are authorized.")]
    [EndpointName("DeleteWorkOrder")]
    [MapToApiVersion("1.0")]
    public async Task<IActionResult> Delete(Guid workOrderId, CancellationToken ct)
    {
        var result = await sender.Send(new DeleteWorkOrderCommand(workOrderId), ct);

        return result.Match(_ => NoContent(), Problem);
    }

    [HttpGet("schedule/{date}")]
    [Authorize]
    [ProducesResponseType(typeof(ScheduleDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    [EndpointSummary("Retrieves the schedule for a given day.")]
    [EndpointDescription("Returns a schedule view for the specified date. You can optionally filter by labor ID.")]
    [EndpointName("GetDailySchedule")]
    [MapToApiVersion("1.0")]
    public async Task<IActionResult> GetSchedule(
        DateOnly? date,
        [FromQuery] Guid? laborId,
        [FromHeader(Name = "X-TimeZone")] string? tz,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(tz))
        {
            return Problem(
                detail: "Missing time zone in 'X-TimeZone' header.",
                statusCode: StatusCodes.Status400BadRequest,
                title: "Time Zone Required");
        }

        TimeZoneInfo timeZone;

        try
        {
            timeZone = TimeZoneInfo.FindSystemTimeZoneById(tz);
        }
        catch
        {
            var windowsTimeZoneId = tz switch
            {
                "Africa/Casablanca" => "Morocco Standard Time",
                "Etc/UTC" => "UTC",
                "Europe/London" => "GMT Standard Time",
                "Europe/Paris" => "Romance Standard Time",
                _ => null
            };

            if (windowsTimeZoneId is null)
            {
                return Problem(
                    detail: $"Invalid or unknown time zone: '{tz}'.",
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Invalid Time Zone");
            }

            timeZone = TimeZoneInfo.FindSystemTimeZoneById(windowsTimeZoneId);
        }

        var scheduleDate = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var effectiveLaborId = GetEffectiveLaborId(laborId);

        if (IsLaborOnly() && effectiveLaborId is null)
        {
            return Forbid();
        }

        var appSettings = options.Value;

        var result = await sender.Send(
            new GetDailyScheduleQuery(
                timeZone,
                scheduleDate,
                appSettings.OpeningTime,
                appSettings.ClosingTime,
                effectiveLaborId),
            ct);

        return result.Match(
            response => Ok(IsLaborOnly() ? SanitizeForLabor(response) : response),
            Problem);
    }

    private bool IsLaborOnly() =>
        User.IsInRole(nameof(Role.Labor)) && !User.IsInRole(nameof(Role.Manager));

    private Guid? GetEffectiveLaborId(Guid? requestedLaborId)
    {
        if (!IsLaborOnly())
        {
            return requestedLaborId;
        }

        return Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var currentLaborId)
            ? currentLaborId
            : null;
    }

    private static WorkOrderDto SanitizeForLabor(WorkOrderDto workOrder)
    {
        workOrder.InvoiceId = null;
        workOrder.TotalPartCost = 0;
        workOrder.TotalLaborCost = 0;
        workOrder.TotalCost = 0;

        if (workOrder.Customer is not null)
        {
            workOrder.Customer.PhoneNumber = string.Empty;
            workOrder.Customer.Email = string.Empty;
            workOrder.Customer.Vehicles = [];
        }

        foreach (var repairTask in workOrder.RepairTasks)
        {
            repairTask.LaborCost = 0;
            repairTask.TotalCost = 0;

            foreach (var part in repairTask.Parts)
            {
                part.Cost = 0;
            }
        }

        return workOrder;
    }

    private static ScheduleDto SanitizeForLabor(ScheduleDto schedule)
    {
        foreach (var slot in schedule.Spots.SelectMany(spot => spot.Slots))
        {
            if (slot.RepairTasks is null)
            {
                continue;
            }

            foreach (var repairTask in slot.RepairTasks)
            {
                repairTask.LaborCost = 0;
                repairTask.TotalCost = 0;

                foreach (var part in repairTask.Parts)
                {
                    part.Cost = 0;
                }
            }
        }

        return schedule;
    }
}
