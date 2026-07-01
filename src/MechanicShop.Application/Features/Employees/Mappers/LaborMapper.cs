using MechanicShop.Application.Features.Employees.Dtos;
using MechanicShop.Domain.Employees;

namespace MechanicShop.Application.Features.Employees.Mappers;

public static class LaborMapper
{
    public static LaborDto ToDto(this Employee employee)
    {
        return new LaborDto { LaborId = employee.Id, Name = employee.FullName };
    }

    public static List<LaborDto> ToDtos(this IEnumerable<Employee> entities)
    {
        return [.. entities.Select(labor => labor.ToDto())];
    }
}
