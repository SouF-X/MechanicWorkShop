using MechanicShop.Application.Common.Errors;
using MechanicShop.Application.Common.Interfaces;
using MechanicShop.Application.Features.Employees.Dtos;
using MechanicShop.Application.Features.Employees.Mappers;
using MechanicShop.Domain.Common.Results;

using MediatR;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MechanicShop.Application.Features.Employees.Queries.GetEmployeeById;

public class GetEmployeeByIdQueryHandler(
    ILogger<GetEmployeeByIdQueryHandler> logger,
    IAppDbContext context,
    IIdentityService identityService)
    : IRequestHandler<GetEmployeeByIdQuery, Result<EmployeeDto>>
{
    private readonly ILogger<GetEmployeeByIdQueryHandler> _logger = logger;
    private readonly IAppDbContext _context = context;
    private readonly IIdentityService _identityService = identityService;

    public async Task<Result<EmployeeDto>> Handle(GetEmployeeByIdQuery query, CancellationToken ct)
    {
        var employee = await _context.Employees
            .AsNoTracking()
            .FirstOrDefaultAsync(employee => employee.Id == query.EmployeeId, ct);

        if (employee is null)
        {
            _logger.LogWarning("Employee with id {EmployeeId} was not found", query.EmployeeId);

            return ApplicationErrors.EmployeeNotFound;
        }

        var emails = await _identityService.GetUserEmailsAsync([employee.Id.ToString()]);

        var email = emails.GetValueOrDefault(employee.Id.ToString(), string.Empty);

        return employee.ToDto(email);
    }
}
