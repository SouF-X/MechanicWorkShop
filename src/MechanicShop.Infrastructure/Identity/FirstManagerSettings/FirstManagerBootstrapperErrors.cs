using MechanicShop.Domain.Common.Results;

namespace MechanicShop.Infrastructure.Identity;

public static class FirstManagerBootstrapperErrors
{
    public static Error EmailMissing =>
        Error.Validation("FirstManager.Email.Missing", "First manager email is missing.");

    public static Error PasswordMissing =>
        Error.Validation("FirstManager.Password.Missing", "First manager password is missing.");

    public static Error RoleCreationFailed(string description) =>
        Error.Failure("FirstManager.Role.CreationFailed", description);

    public static Error UserCreationFailed(string description) =>
        Error.Failure("FirstManager.User.CreationFailed", description);

    public static Error RoleAssignmentFailed(string description) =>
        Error.Failure("FirstManager.Role.AssignmentFailed", description);
}