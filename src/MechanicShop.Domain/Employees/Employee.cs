using System.Diagnostics.Contracts;
using MechanicShop.Domain.Common;
using MechanicShop.Domain.Common.Results;
using MechanicShop.Domain.Identity;

namespace MechanicShop.Domain.Employees;

public sealed class Employee : AuditableEntity
{
    public string? FirstName { get; private set; }
    public string? LastName { get; private set; }
    public Role Role { get; private set; }

    public bool IsActive { get; private set; } = true;
    public string FullName => $"{FirstName} {LastName}";

    private Employee()
    { }

    private Employee(Guid id, string firstName, string lastName, Role role)
        : base(id)
    {
        FirstName = firstName;
        LastName = lastName;
        Role = role;
    }

    public static Result<Employee> Create(Guid id, string firstName, string lastName, Role role)
    {
        if (id == Guid.Empty)
        {
            return EmployeeErrors.IdRequired;
        }

        if (string.IsNullOrWhiteSpace(firstName))
        {
            return EmployeeErrors.FirstNameRequired;
        }

        if (string.IsNullOrWhiteSpace(lastName))
        {
            return EmployeeErrors.LastNameRequired;
        }

        if (!Enum.IsDefined(role))
        {
            return EmployeeErrors.RoleInvalid;
        }

        return new Employee(id, firstName.Trim(), lastName.Trim(), role);
    }

    public Result<Updated> UpdateDetails(string firstName, string lastName)
    {
        if (string.IsNullOrWhiteSpace(firstName))
        {
            return EmployeeErrors.FirstNameRequired;
        }

        if (string.IsNullOrWhiteSpace(lastName))
        {
            return EmployeeErrors.LastNameRequired;
        }


        FirstName = firstName.Trim();
        LastName = lastName.Trim();

        return Result.Updated;
    }

    public Result<Updated> ChangeRole(Role role)
    {
        if (!Enum.IsDefined(role))
        {
            return EmployeeErrors.RoleInvalid;
        }

        Role = role;

        return Result.Updated;
    }

    public Result<Updated> Deactivate()
    {
        IsActive = false;

        return Result.Updated;
    }

    public Result<Updated> Reactivate()
    {
        IsActive = true;

        return Result.Updated;
    }
}