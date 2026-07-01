using Asp.Versioning;

using MechanicShop.Application.Features.Employees.Commands.CreateEmployee;
using MechanicShop.Application.Features.Employees.Commands.DeactivateEmployee;
using MechanicShop.Application.Features.Employees.Commands.ReactivateEmployee;
using MechanicShop.Application.Features.Employees.Commands.UpdateEmployee;
using MechanicShop.Application.Features.Employees.Dtos;
using MechanicShop.Application.Features.Employees.Queries.GetEmployeeById;
using MechanicShop.Application.Features.Employees.Queries.GetEmployees;
using MechanicShop.Contracts.Requests.Employees;

using MediatR;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

using DomainRole = MechanicShop.Domain.Identity.Role;

namespace MechanicShop.Api.Controllers;

[Route("api/v{version:apiVersion}/employees")]
[ApiVersion("1.0")]
[Authorize(Roles = nameof(DomainRole.Manager))]
[EnableRateLimiting("SlidingWindow")]
public sealed class EmployeesController(ISender sender) : ApiController
{
    [HttpGet]
    [ProducesResponseType(typeof(List<EmployeeDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    [EndpointSummary("Retrieves all employees.")]
    [EndpointDescription("Returns employee accounts, optionally filtered by role and activation status.")]
    [EndpointName("GetEmployees")]
    [MapToApiVersion("1.0")]
    public async Task<IActionResult> Get(
        [FromQuery] EmployeeFilterRequest filters,
        CancellationToken ct)
    {
        var domainRole = filters.Role.HasValue ? (DomainRole?)filters.Role.Value : null;
        var result = await sender.Send(new GetEmployeesQuery(domainRole, filters.IsActive), ct);

        return result.Match(
            response => Ok(response),
            Problem);
    }

    [HttpGet("{employeeId:guid}", Name = "GetEmployeeById")]
    [ProducesResponseType(typeof(EmployeeDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    [EndpointSummary("Retrieves an employee by ID.")]
    [EndpointDescription("Returns the employee account matching the specified ID.")]
    [EndpointName("GetEmployeeById")]
    [MapToApiVersion("1.0")]
    public async Task<IActionResult> GetById(Guid employeeId, CancellationToken ct)
    {
        var result = await sender.Send(new GetEmployeeByIdQuery(employeeId), ct);

        return result.Match(
            response => Ok(response),
            Problem);
    }

    [HttpPost]
    [ProducesResponseType(typeof(EmployeeDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    [EndpointSummary("Creates a new employee.")]
    [EndpointDescription("Creates an employee and the matching Identity account.")]
    [EndpointName("CreateEmployee")]
    [MapToApiVersion("1.0")]
    public async Task<IActionResult> Create([FromBody] CreateEmployeeRequest request, CancellationToken ct)
    {
        var command = new CreateEmployeeCommand(
            request.FirstName,
            request.LastName,
            request.Email,
            request.Password,
            (DomainRole)request.Role!.Value);

        var result = await sender.Send(command, ct);

        return result.Match(
            response => CreatedAtRoute(
                "GetEmployeeById",
                new { version = "1.0", employeeId = response.EmployeeId },
                response),
            Problem);
    }

    [HttpPut("{employeeId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    [EndpointSummary("Updates an existing employee.")]
    [EndpointDescription("Updates the employee details and the matching Identity account.")]
    [EndpointName("UpdateEmployee")]
    [MapToApiVersion("1.0")]
    public async Task<IActionResult> Update(
        Guid employeeId,
        [FromBody] UpdateEmployeeRequest request,
        CancellationToken ct)
    {
        var command = new UpdateEmployeeCommand(
            employeeId,
            request.FirstName,
            request.LastName,
            request.Email,
            (DomainRole)request.Role!.Value);

        var result = await sender.Send(command, ct);

        return result.Match(
            _ => NoContent(),
            Problem);
    }

    [HttpPatch("{employeeId:guid}/deactivate")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    [EndpointSummary("Deactivates an employee.")]
    [EndpointDescription("Marks the employee as inactive and locks the matching Identity account.")]
    [EndpointName("DeactivateEmployee")]
    [MapToApiVersion("1.0")]
    public async Task<IActionResult> Deactivate(Guid employeeId, CancellationToken ct)
    {
        var result = await sender.Send(new DeactivateEmployeeCommand(employeeId), ct);

        return result.Match(
            _ => NoContent(),
            Problem);
    }

    [HttpPatch("{employeeId:guid}/reactivate")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    [EndpointSummary("Reactivates an employee.")]
    [EndpointDescription("Marks the employee as active and unlocks the matching Identity account.")]
    [EndpointName("ReactivateEmployee")]
    [MapToApiVersion("1.0")]
    public async Task<IActionResult> Reactivate(Guid employeeId, CancellationToken ct)
    {
        var result = await sender.Send(new ReactivateEmployeeCommand(employeeId), ct);

        return result.Match(
            _ => NoContent(),
            Problem);
    }
}
