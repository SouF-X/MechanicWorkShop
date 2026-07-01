using MechanicShop.Application.Common.Errors;
using MechanicShop.Application.Common.Interfaces;
using MechanicShop.Domain.Common.Results;
using MechanicShop.Domain.Identity;

using MediatR;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Logging;

namespace MechanicShop.Application.Features.Employees.Commands.UpdateEmployee;

public class UpdateEmployeeCommandHandler(
    ILogger<UpdateEmployeeCommandHandler> logger,
    IAppDbContext context,
    IIdentityService identityService,
    HybridCache cache)
    : IRequestHandler<UpdateEmployeeCommand, Result<Updated>>
{
    private readonly ILogger<UpdateEmployeeCommandHandler> _logger = logger;
    private readonly IAppDbContext _context = context;
    private readonly IIdentityService _identityService = identityService;
    private readonly HybridCache _cache = cache;

    public async Task<Result<Updated>> Handle(UpdateEmployeeCommand command, CancellationToken ct)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(employee => employee.Id == command.EmployeeId, ct);

        if (employee is null)
        {
            _logger.LogWarning("Employee {EmployeeId} not found for update", command.EmployeeId);

            return ApplicationErrors.EmployeeNotFound;
        }

        if (employee.Role == Role.Manager && employee.IsActive && command.Role != Role.Manager)
        {
            var otherActiveManagersExist = await _context.Employees
                .AnyAsync(e => e.Id != employee.Id && e.Role == Role.Manager && e.IsActive, ct);

            if (!otherActiveManagersExist)
            {
                _logger.LogWarning("Employee {EmployeeId} role change rejected because they are the only active manager", employee.Id);

                return ApplicationErrors.LastActiveManagerCannotBeDeactivated;
            }
        }

        await using var transaction = await _context.BeginTransactionAsync(ct);

        var updateDetailsResult = employee.UpdateDetails(command.FirstName, command.LastName);

        if (updateDetailsResult.IsError)
        {
            return updateDetailsResult.Errors;
        }

        var changeRoleResult = employee.ChangeRole(command.Role);

        if (changeRoleResult.IsError)
        {
            return changeRoleResult.Errors;
        }

        var updateUserResult = await _identityService.UpdateUserAsync(
            employee.Id.ToString(),
            command.Email,
            command.Role);

        if (updateUserResult.IsError)
        {
            return updateUserResult.Errors;
        }

        await _context.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        await _cache.RemoveByTagAsync("employee", ct);

        _logger.LogInformation("Employee {EmployeeId} updated successfully", employee.Id);

        return Result.Updated;
    }
}
