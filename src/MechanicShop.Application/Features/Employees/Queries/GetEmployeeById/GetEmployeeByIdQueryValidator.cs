using FluentValidation;

namespace MechanicShop.Application.Features.Employees.Queries.GetEmployeeById;

public sealed class GetEmployeeByIdQueryValidator : AbstractValidator<GetEmployeeByIdQuery>
{
    public GetEmployeeByIdQueryValidator()
    {
        RuleFor(request => request.EmployeeId)
            .NotEmpty()
            .WithErrorCode("EmployeeId_Is_Required")
            .WithMessage("EmployeeId is required.");
    }
}
