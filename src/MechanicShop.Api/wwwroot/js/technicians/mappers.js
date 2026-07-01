(function () {
  // Converts backend EmployeeDto into the frontend technician table shape.
  function mapEmployee(dto) {
    return {
      id: dto.employeeId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      name: `${dto.firstName} ${dto.lastName}`.trim(),
      email: dto.email,
      role: Number(dto.role) === 1 ? "Manager" : "Labor",
      roleValue: Number(dto.role),
      active: Boolean(dto.isActive),
    };
  }

  // Converts frontend employee form values to backend create/update shape.
  function toEmployeePayload(employee) {
    return {
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      role: employee.roleValue,
      ...(employee.password ? { password: employee.password } : {}),
    };
  }

  window.TechnicianMappers = { mapEmployee, toEmployeePayload };
})();
