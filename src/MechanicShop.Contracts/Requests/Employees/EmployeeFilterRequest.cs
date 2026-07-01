using MechanicShop.Contracts.Common;

namespace MechanicShop.Contracts.Requests.Employees;

public sealed record EmployeeFilterRequest
{
    public Role? Role { get; set; }
    public bool? IsActive { get; set; }
}
