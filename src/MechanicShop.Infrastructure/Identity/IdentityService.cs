using MechanicShop.Application.Common.Interfaces;
using MechanicShop.Application.Features.Identity.Dtos;
using MechanicShop.Domain.Common.Results;
using MechanicShop.Domain.Identity;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace MechanicShop.Infrastructure.Identity;

public class IdentityService(
    UserManager<AppUser> userManager,
    RoleManager<IdentityRole> roleManager,
    IUserClaimsPrincipalFactory<AppUser> userClaimsPrincipalFactory,
    IAuthorizationService authorizationService) : IIdentityService
{
    private readonly UserManager<AppUser> _userManager = userManager;
    private readonly RoleManager<IdentityRole> _roleManager = roleManager;
    private readonly IUserClaimsPrincipalFactory<AppUser> _userClaimsPrincipalFactory = userClaimsPrincipalFactory;
    private readonly IAuthorizationService _authorizationService = authorizationService;

    public async Task<bool> IsInRoleAsync(string userId, string role)
    {
        var user = await _userManager.FindByIdAsync(userId);

        return user != null && await _userManager.IsInRoleAsync(user, role);
    }

    public async Task<bool> AuthorizeAsync(string userId, string? policyName)
    {
        var user = await _userManager.FindByIdAsync(userId);

        if (user == null)
        {
            return false;
        }

        var principal = await _userClaimsPrincipalFactory.CreateAsync(user);

        var result = await _authorizationService.AuthorizeAsync(principal, policyName!);

        return result.Succeeded;
    }

    public async Task<Result<AppUserDto>> AuthenticateAsync(string email, string password)
    {
        var user = await _userManager.FindByEmailAsync(email);

        if (user is null)
        {
            return Error.NotFound("User_Not_Found", $"User with email {UtilityService.MaskEmail(email)} not found");
        }

        if (!user.EmailConfirmed)
        {
            return Error.Conflict("Email_Not_Confirmed", $"email '{UtilityService.MaskEmail(email)}' not confirmed");
        }

        if (await _userManager.IsLockedOutAsync(user))
        {
            return Error.Forbidden(
                "Identity.User.Inactive",
                "This user account is inactive.");
        }

        if (!await _userManager.CheckPasswordAsync(user, password))
        {
            return Error.Conflict("Invalid_Login_Attempt", "Email / Password are incorrect");
        }

        return new AppUserDto(user.Id, user.Email!, await _userManager.GetRolesAsync(user), await _userManager.GetClaimsAsync(user));
    }

    public async Task<Result<AppUserDto>> GetUserByIdAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId) ?? throw new InvalidOperationException(nameof(userId));

        var roles = await _userManager.GetRolesAsync(user);

        var claims = await _userManager.GetClaimsAsync(user);

        return new AppUserDto(user.Id, user.Email!, roles, claims);
    }

    public async Task<string?> GetUserNameAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);

        return user?.UserName;
    }

    public async Task<Result<string>> CreateUserAsync(string email, string password, Role role)
    {
        var existingUser = await _userManager.FindByEmailAsync(email);

        if (existingUser is not null)
        {
            return Error.Conflict(
                "Identity.Email.AlreadyExists",
                "A user with this email already exists.");
        }

        var roleName = role.ToString();

        if (!await _roleManager.RoleExistsAsync(roleName))
        {
            var createRoleResult = await _roleManager.CreateAsync(new IdentityRole(roleName));

            if (!createRoleResult.Succeeded)
            {
                return createRoleResult.Errors
                    .Select(error => Error.Failure(
                        $"Identity.{error.Code}",
                        error.Description))
                    .ToList();
            }
        }

        var user = new AppUser
        {
            Email = email,
            UserName = email,
            EmailConfirmed = true
        };

        var createResult = await _userManager.CreateAsync(user, password);

        if (!createResult.Succeeded)
        {
            return createResult.Errors
                .Select(error => Error.Validation(
                    $"Identity.{error.Code}",
                    error.Description))
                .ToList();
        }

        var addRoleResult = await _userManager.AddToRoleAsync(user, roleName);

        if (!addRoleResult.Succeeded)
        {
            await _userManager.DeleteAsync(user);

            return addRoleResult.Errors
                .Select(error => Error.Validation(
                    $"Identity.{error.Code}",
                    error.Description))
                .ToList();
        }

        return user.Id;
    }

    public async Task<IReadOnlyDictionary<string, string>> GetUserEmailsAsync(IEnumerable<string> userIds)
    {
        var ids = userIds.ToArray();

        return await _userManager.Users
            .Where(user => ids.Contains(user.Id))
            .ToDictionaryAsync(
                user => user.Id,
                user => user.Email ?? string.Empty);
    }

    public async Task<Result<Updated>> UpdateUserAsync(string userId, string email, Role role)
    {
        var user = await _userManager.FindByIdAsync(userId);

        if (user is null)
        {
            return Error.NotFound(
                "Identity.User.NotFound",
                "The user account does not exist.");
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var existingUser = await _userManager.FindByEmailAsync(normalizedEmail);

        if (existingUser is not null && existingUser.Id != userId)
        {
            return Error.Conflict(
                "Identity.Email.AlreadyExists",
                "A user with this email already exists.");
        }

        var roleName = role.ToString();

        if (!await _roleManager.RoleExistsAsync(roleName))
        {
            var createRoleResult = await _roleManager.CreateAsync(new IdentityRole(roleName));

            if (!createRoleResult.Succeeded)
            {
                return createRoleResult.Errors
                    .Select(error => Error.Failure(
                        $"Identity.{error.Code}",
                        error.Description))
                    .ToList();
            }
        }

        user.Email = normalizedEmail;
        user.UserName = normalizedEmail;

        var updateResult = await _userManager.UpdateAsync(user);

        if (!updateResult.Succeeded)
        {
            return updateResult.Errors
                .Select(error => Error.Validation(
                    $"Identity.{error.Code}",
                    error.Description))
                .ToList();
        }

        var currentRoles = await _userManager.GetRolesAsync(user);

        if (!currentRoles.Contains(roleName))
        {
            var addRoleResult = await _userManager.AddToRoleAsync(user, roleName);

            if (!addRoleResult.Succeeded)
            {
                return addRoleResult.Errors
                    .Select(error => Error.Validation(
                        $"Identity.{error.Code}",
                        error.Description))
                    .ToList();
            }
        }

        var rolesToRemove = currentRoles
            .Where(currentRole => currentRole != roleName)
            .ToArray();

        if (rolesToRemove.Length > 0)
        {
            var removeRolesResult = await _userManager.RemoveFromRolesAsync(user, rolesToRemove);

            if (!removeRolesResult.Succeeded)
            {
                return removeRolesResult.Errors
                    .Select(error => Error.Validation(
                        $"Identity.{error.Code}",
                        error.Description))
                    .ToList();
            }
        }

        return Result.Updated;
    }

    public async Task<Result<Updated>> SetUserActiveAsync(string userId, bool isActive)
    {
        var user = await _userManager.FindByIdAsync(userId);

        if (user is null)
        {
            return Error.NotFound(
                "Identity.User.NotFound",
                "The user account does not exist.");
        }

        var enableLockoutResult = await _userManager.SetLockoutEnabledAsync(user, true);

        if (!enableLockoutResult.Succeeded)
        {
            return enableLockoutResult.Errors
                .Select(error => Error.Failure(
                    $"Identity.{error.Code}",
                    error.Description))
                .ToList();
        }

        DateTimeOffset? lockoutEnd = isActive ? null : DateTimeOffset.MaxValue;
        var lockoutResult = await _userManager.SetLockoutEndDateAsync(user, lockoutEnd);

        if (!lockoutResult.Succeeded)
        {
            return lockoutResult.Errors
                .Select(error => Error.Failure(
                    $"Identity.{error.Code}",
                    error.Description))
                .ToList();
        }

        return Result.Updated;
    }
}
