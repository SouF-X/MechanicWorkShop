using MechanicShop.Application.Common.Interfaces;
using MechanicShop.Application.Features.Employees.Dtos;
using MechanicShop.Application.Features.Employees.Mappers;
using MechanicShop.Domain.Common.Results;
using MechanicShop.Domain.Employees;

using MediatR;

using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Logging;

namespace MechanicShop.Application.Features.Employees.Commands.CreateEmployee;

public sealed class CreateEmployeeCommandHandler(
    ILogger<CreateEmployeeCommandHandler> logger,
    IAppDbContext context,
    IIdentityService identityService,
    HybridCache cache)
    : IRequestHandler<CreateEmployeeCommand, Result<EmployeeDto>>
{
    private readonly ILogger<CreateEmployeeCommandHandler> _logger = logger;
    private readonly IAppDbContext _context = context;
    private readonly IIdentityService _identityService = identityService;
    private readonly HybridCache _cache = cache;

    public async Task<Result<EmployeeDto>> Handle(CreateEmployeeCommand command, CancellationToken ct)
    {
        var email = command.Email.Trim().ToLowerInvariant();

        await using var transaction = await _context.BeginTransactionAsync(ct);

        var createUserResult = await _identityService.CreateUserAsync(
            email,
            command.Password,
            command.Role);

        if (createUserResult.IsError)
        {
            return createUserResult.Errors;
        }

        var userId = createUserResult.Value;

        if (!Guid.TryParse(userId, out var employeeId))
        {
            return Error.Failure(
                "Employee.IdentityId.Invalid",
                "The generated Identity user ID is not a valid employee ID.");
        }

        var createEmployeeResult = Employee.Create(
            employeeId,
            command.FirstName,
            command.LastName,
            command.Role);

        if (createEmployeeResult.IsError)
        {
            return createEmployeeResult.Errors;
        }

        var employee = createEmployeeResult.Value;

        _context.Employees.Add(employee);

        await _context.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        await _cache.RemoveByTagAsync("employee", ct);

        _logger.LogInformation(
            "Employee {EmployeeId} created successfully with role {Role}",
            employee.Id,
            employee.Role);

        return employee.ToDto(email);
    }
}
