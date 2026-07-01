using MechanicShop.Application.Features.Employees.Dtos;
using MechanicShop.Domain.Employees;

namespace MechanicShop.Application.Features.Employees.Mappers;

public static class EmployeeMapper
{
    public static EmployeeDto ToDto(this Employee employee, string email)
    {
        ArgumentNullException.ThrowIfNull(employee);

        return new EmployeeDto
        {
            EmployeeId = employee.Id,
            FirstName = employee.FirstName ?? string.Empty,
            LastName = employee.LastName ?? string.Empty,
            Email = email,
            Role = employee.Role,
            IsActive = employee.IsActive
        };
    }
}
