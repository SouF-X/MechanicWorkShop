using MechanicShop.Application.Common.Errors;
using MechanicShop.Application.Common.Interfaces;
using MechanicShop.Domain.Common.Results;

using MediatR;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Logging;

namespace MechanicShop.Application.Features.Employees.Commands.ReactivateEmployee;

public class ReactivateEmployeeCommandHandler(
    ILogger<ReactivateEmployeeCommandHandler> logger,
    IAppDbContext context,
    IIdentityService identityService,
    IUserStatusService userStatusService,
    HybridCache cache)
    : IRequestHandler<ReactivateEmployeeCommand, Result<Updated>>
{
    private readonly ILogger<ReactivateEmployeeCommandHandler> _logger = logger;
    private readonly IAppDbContext _context = context;
    private readonly IIdentityService _identityService = identityService;
    private readonly IUserStatusService _userStatusService = userStatusService;
    private readonly HybridCache _cache = cache;

    public async Task<Result<Updated>> Handle(ReactivateEmployeeCommand command, CancellationToken ct)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(employee => employee.Id == command.EmployeeId, ct);

        if (employee is null)
        {
            _logger.LogWarning("Employee {EmployeeId} not found for reactivation", command.EmployeeId);

            return ApplicationErrors.EmployeeNotFound;
        }

        await using var transaction = await _context.BeginTransactionAsync(ct);

        var reactivateResult = employee.Reactivate();

        if (reactivateResult.IsError)
        {
            return reactivateResult.Errors;
        }

        var reactivateUserResult = await _identityService.SetUserActiveAsync(
            employee.Id.ToString(),
            true);

        if (reactivateUserResult.IsError)
        {
            return reactivateUserResult.Errors;
        }

        await _context.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        await _userStatusService.SetActiveAsync(employee.Id.ToString(), true, ct);

        await _cache.RemoveByTagAsync("employee", ct);

        _logger.LogInformation("Employee {EmployeeId} reactivated successfully", employee.Id);

        return Result.Updated;
    }
}
