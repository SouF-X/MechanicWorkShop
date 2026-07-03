using MechanicShop.Domain.Common.Results;
using MechanicShop.Domain.Employees;
using MechanicShop.Domain.Identity;
using MechanicShop.Infrastructure.Data;

using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace MechanicShop.Infrastructure.Identity;

public sealed class FirstManagerBootstrapper(
    UserManager<AppUser> userManager,
    RoleManager<IdentityRole> roleManager,
    AppDbContext context,
    IOptions<FirstManagerSettings> options)
{
    private readonly FirstManagerSettings _settings = options.Value;

    public async Task<Result<Success>> InitialiseAsync()
    {
        if (string.IsNullOrWhiteSpace(_settings.Email))
        {
            return FirstManagerBootstrapperErrors.EmailMissing;
        }

        if (string.IsNullOrWhiteSpace(_settings.Password))
        {
            return FirstManagerBootstrapperErrors.PasswordMissing;
        }

        var roleName = nameof(Role.Manager);

        if (!await roleManager.RoleExistsAsync(roleName))
        {
            var roleResult =
                await roleManager.CreateAsync(new IdentityRole(roleName));

            if (!roleResult.Succeeded)
            {
                return FirstManagerBootstrapperErrors.RoleCreationFailed(
                    roleResult.Errors.First().Description);
            }
        }

        var manager = await userManager.FindByEmailAsync(_settings.Email);

        if (manager is null)
        {
            manager = new AppUser
            {
                Email = _settings.Email,
                UserName = _settings.Email,
                EmailConfirmed = true
            };

            var createResult =
                await userManager.CreateAsync(manager, _settings.Password);

            if (!createResult.Succeeded)
            {
                return FirstManagerBootstrapperErrors.UserCreationFailed(
                    createResult.Errors.First().Description);
            }
        }

        if (!await userManager.CheckPasswordAsync(manager, _settings.Password))
        {
            var resetToken = await userManager.GeneratePasswordResetTokenAsync(manager);
            var resetResult = await userManager.ResetPasswordAsync(manager, resetToken, _settings.Password);

            if (!resetResult.Succeeded)
            {
                return FirstManagerBootstrapperErrors.UserCreationFailed(
                    resetResult.Errors.First().Description);
            }
        }

        if (!await userManager.IsInRoleAsync(manager, roleName))
        {
            var roleResult =
                await userManager.AddToRoleAsync(manager, roleName);

            if (!roleResult.Succeeded)
            {
                return FirstManagerBootstrapperErrors.RoleAssignmentFailed(
                    roleResult.Errors.First().Description);
            }
        }

        if (!Guid.TryParse(manager.Id, out var employeeId))
        {
            return Error.Failure(
                "FirstManager.Id.Invalid",
                "The first manager Identity ID is invalid.");
        }

        var employeeExists = await context.Employees
            .AnyAsync(employee => employee.Id == employeeId);

        if (!employeeExists)
        {
            var employeeResult = Employee.Create(
                employeeId,
                _settings.FirstName,
                _settings.LastName,
                Role.Manager);

            if (employeeResult.IsError)
            {
                return employeeResult.Errors;
            }

            context.Employees.Add(employeeResult.Value);
            await context.SaveChangesAsync();
        }

        return Result.Success;
    }
}