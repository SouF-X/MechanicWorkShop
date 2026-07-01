using FluentValidation;

namespace MechanicShop.Application.Features.Employees.Commands.ReactivateEmployee;

public sealed class ReactivateEmployeeCommandValidator : AbstractValidator<ReactivateEmployeeCommand>
{
    public ReactivateEmployeeCommandValidator()
    {
        RuleFor(command => command.EmployeeId)
            .NotEmpty()
            .WithMessage("Employee Id is required.");
    }
}
