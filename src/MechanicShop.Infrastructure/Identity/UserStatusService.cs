using MechanicShop.Application.Common.Interfaces;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;

namespace MechanicShop.Infrastructure.Identity;

public sealed class UserStatusService(
    HybridCache cache,
    IAppDbContext context) : IUserStatusService
{
    private readonly HybridCache _cache = cache;
    private readonly IAppDbContext _context = context;

    public async Task<bool> IsActiveAsync(string userId, CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(userId, out var employeeId))
        {
            return false;
        }

        return await _cache.GetOrCreateAsync(GetCacheKey(userId),
            async ct =>
            {
                return await _context.Employees
                    .AsNoTracking()
                    .Where(employee => employee.Id == employeeId)
                    .Select(employee => (bool?)employee.IsActive)
                    .SingleOrDefaultAsync(ct)
                    ?? false;
            },
            cancellationToken: cancellationToken);
    }

    public async Task SetActiveAsync(string userId, bool isActive, CancellationToken cancellationToken = default)
    {
        await _cache.SetAsync(GetCacheKey(userId), isActive, cancellationToken: cancellationToken);
    }

    private static string GetCacheKey(string userId)
    {
        return $"user-status:{userId}";
    }
}