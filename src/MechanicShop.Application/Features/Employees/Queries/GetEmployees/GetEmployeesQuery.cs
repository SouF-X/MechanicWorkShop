using MechanicShop.Application.Common.Interfaces;
using MechanicShop.Application.Features.Employees.Dtos;
using MechanicShop.Domain.Common.Results;
using MechanicShop.Domain.Identity;

namespace MechanicShop.Application.Features.Employees.Queries.GetEmployees;

public sealed record GetEmployeesQuery(
    Role? Role = null,
    bool? IsActive = null) : ICachedQuery<Result<List<EmployeeDto>>>
{
    public string CacheKey =>
        $"employees:role={Role?.ToString() ?? "all"}:active={IsActive?.ToString() ?? "all"}";

    public string[] Tags => ["employee"];

    public TimeSpan Expiration => TimeSpan.FromMinutes(10);
}
