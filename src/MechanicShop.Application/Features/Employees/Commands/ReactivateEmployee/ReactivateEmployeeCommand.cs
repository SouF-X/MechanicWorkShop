using MechanicShop.Domain.Common.Results;

using MediatR;

namespace MechanicShop.Application.Features.Employees.Commands.ReactivateEmployee;

public sealed record ReactivateEmployeeCommand(Guid EmployeeId) : IRequest<Result<Updated>>;
