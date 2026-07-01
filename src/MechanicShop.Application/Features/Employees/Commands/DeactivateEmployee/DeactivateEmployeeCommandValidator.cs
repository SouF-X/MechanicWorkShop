using FluentValidation;

namespace MechanicShop.Application.Features.Employees.Commands.DeactivateEmployee;

public sealed class DeactivateEmployeeCommandValidator : AbstractValidator<DeactivateEmployeeCommand>
{
    public DeactivateEmployeeCommandValidator()
    {
        RuleFor(command => command.EmployeeId)
            .NotEmpty()
            .WithMessage("Employee Id is required.");
    }
}
