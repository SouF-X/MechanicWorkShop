using MechanicShop.Application.Features.Identity.Dtos;
using MechanicShop.Domain.Common.Results;
using MechanicShop.Domain.Identity;

namespace MechanicShop.Application.Common.Interfaces;

public interface IIdentityService
{
    Task<bool> IsInRoleAsync(string userId, string role);

    Task<bool> AuthorizeAsync(string userId, string? policyName);

    Task<Result<AppUserDto>> AuthenticateAsync(string email, string password);

    Task<Result<AppUserDto>> GetUserByIdAsync(string userId);

    Task<string?> GetUserNameAsync(string userId);

    Task<Result<string>> CreateUserAsync(string email, string password, Role role);

    Task<IReadOnlyDictionary<string, string>> GetUserEmailsAsync(IEnumerable<string> userIds);

    Task<Result<Updated>> UpdateUserAsync(string userId, string email, Role role);

    Task<Result<Updated>> SetUserActiveAsync(string userId, bool isActive);
}
