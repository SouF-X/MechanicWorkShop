using MechanicShop.Domain.Common.Results;
using MechanicShop.Domain.Identity;

using MediatR;

namespace MechanicShop.Application.Features.Employees.Commands.UpdateEmployee;

public sealed record UpdateEmployeeCommand(
    Guid EmployeeId,
    string FirstName,
    string LastName,
    string Email,
    Role Role) : IRequest<Result<Updated>>;
