using MechanicShop.Application.Common.Errors;
using MechanicShop.Application.Common.Interfaces;
using MechanicShop.Domain.Common.Results;
using MechanicShop.Domain.Identity;

using MediatR;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Logging;

namespace MechanicShop.Application.Features.Employees.Commands.DeactivateEmployee;

public class DeactivateEmployeeCommandHandler(
    ILogger<DeactivateEmployeeCommandHandler> logger,
    IAppDbContext context,
    IIdentityService identityService,
    IUserStatusService userStatusService,
    HybridCache cache)
    : IRequestHandler<DeactivateEmployeeCommand, Result<Updated>>
{
    private readonly ILogger<DeactivateEmployeeCommandHandler> _logger = logger;
    private readonly IAppDbContext _context = context;
    private readonly IIdentityService _identityService = identityService;

    private readonly IUserStatusService _userStatusService = userStatusService;
    private readonly HybridCache _cache = cache;

    public async Task<Result<Updated>> Handle(DeactivateEmployeeCommand command, CancellationToken ct)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(employee => employee.Id == command.EmployeeId, ct);

        if (employee is null)
        {
            _logger.LogWarning("Employee {EmployeeId} not found for deactivation", command.EmployeeId);

            return ApplicationErrors.EmployeeNotFound;
        }

        if (employee.Role == Role.Manager && employee.IsActive)
        {
            var otherActiveManagersExist = await _context.Employees
                .AnyAsync(e => e.Id != employee.Id && e.Role == Role.Manager && e.IsActive, ct);

            if (!otherActiveManagersExist)
            {
                _logger.LogWarning("Employee {EmployeeId} deactivation rejected because they are the only active manager", employee.Id);

                return ApplicationErrors.LastActiveManagerCannotBeDeactivated;
            }
        }

        await using var transaction = await _context.BeginTransactionAsync(ct);

        var deactivateResult = employee.Deactivate();

        if (deactivateResult.IsError)
        {
            return deactivateResult.Errors;
        }

        var deactivateUserResult = await _identityService.SetUserActiveAsync(
            employee.Id.ToString(),
            false);

        if (deactivateUserResult.IsError)
        {
            return deactivateUserResult.Errors;
        }

        await _context.RefreshTokens
            .Where(token => token.UserId == employee.Id.ToString())
            .ExecuteDeleteAsync(ct);

        await _context.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        await _userStatusService.SetActiveAsync(employee.Id.ToString(), false, ct);

        await _cache.RemoveByTagAsync("employee", ct);

        _logger.LogInformation("Employee {EmployeeId} deactivated successfully", employee.Id);

        return Result.Updated;
    }
}
