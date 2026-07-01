using MechanicShop.Application.Common.Interfaces;
using MechanicShop.Application.Features.Employees.Dtos;
using MechanicShop.Application.Features.Employees.Mappers;
using MechanicShop.Domain.Common.Results;

using MediatR;

using Microsoft.EntityFrameworkCore;

namespace MechanicShop.Application.Features.Employees.Queries.GetEmployees;

public sealed class GetEmployeesQueryHandler(
    IAppDbContext context,
    IIdentityService identityService)
    : IRequestHandler<GetEmployeesQuery, Result<List<EmployeeDto>>>
{
    private readonly IAppDbContext _context = context;
    private readonly IIdentityService _identityService = identityService;

    public async Task<Result<List<EmployeeDto>>> Handle(
        GetEmployeesQuery query,
        CancellationToken ct)
    {
        var employeesQuery = _context.Employees.AsNoTracking();

        if (query.Role.HasValue)
        {
            employeesQuery = employeesQuery.Where(employee => employee.Role == query.Role.Value);
        }

        if (query.IsActive.HasValue)
        {
            employeesQuery = employeesQuery.Where(employee => employee.IsActive == query.IsActive.Value);
        }

        var employees = await employeesQuery
            .OrderBy(employee => employee.FirstName)
            .ThenBy(employee => employee.LastName)
            .ToListAsync(ct);

        var emails = await _identityService.GetUserEmailsAsync(
            employees.Select(employee => employee.Id.ToString()));

        var employeeDtos = employees
            .Select(employee => employee.ToDto(
                emails.GetValueOrDefault(employee.Id.ToString(), string.Empty)))
            .ToList();

        return employeeDtos;
    }
}
