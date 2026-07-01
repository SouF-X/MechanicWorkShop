(function () {
  const STATES = ["Scheduled", "InProgress", "Completed", "Cancelled"];

  // Converts backend paged result to item array.
  function pageItems(result) {
    return result.items || result.Items || [];
  }

  // Converts backend WorkOrderListItemDto into table row shape.
  function mapWorkOrder(dto) {
    const vehicle = dto.vehicle || {};
    return {
      id: dto.workOrderId,
      number: dto.workOrderNumber,
      invoiceId: dto.invoiceId,
      invoiceNumber: dto.invoiceId ? String(dto.invoiceId).slice(0, 8) : null,
      customer: dto.customer || "Customer",
      vehicle: `${vehicle.year || ""} ${vehicle.make || ""} ${vehicle.model || ""}`.trim(),
      plate: vehicle.licensePlate || "",
      technician: dto.labor || "Unassigned",
      scheduledAt: dto.startAtUtc,
      tasksCount: (dto.repairTasks || []).length,
      state: STATES[Number(dto.state)] || "Scheduled",
      spot: Number(dto.spot),
      bay: `Bay ${Number(dto.spot) + 1}`,
    };
  }

  // Converts backend CustomerDto list into modal vehicle options.
  function mapVehicles(customers) {
    return customers.flatMap((customer) =>
      (customer.vehicles || []).map((vehicle) => ({
        id: vehicle.vehicleId,
        label: `${customer.name} — ${vehicle.year} ${vehicle.make} ${vehicle.model} · ${vehicle.licensePlate}`,
      })),
    );
  }

  // Converts backend employees to modal labor options.
  function mapLabors(employees) {
    return employees
      .filter((employee) => employee.isActive && (Number(employee.role) === 0 || employee.role === "Labor"))
      .map((employee) => ({ id: employee.employeeId, label: `${employee.firstName} ${employee.lastName}`.trim() }));
  }

  // Converts backend repair tasks to modal task options.
  function mapRepairTasks(tasks) {
    return tasks.map((task) => ({ id: task.repairTaskId, name: task.name, price: Number(task.laborCost) }));
  }

  window.WorkOrderMappers = { pageItems, mapWorkOrder, mapVehicles, mapLabors, mapRepairTasks };
})();
