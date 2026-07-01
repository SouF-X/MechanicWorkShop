(function () {
  // Converts backend RepairTaskDto into the shape used by the table/form UI.
  function mapRepairTask(dto) {
    return {
      id: dto.repairTaskId,
      name: dto.name,
      durationMin: Number(dto.estimatedDurationInMins),
      laborCost: Number(dto.laborCost),
      parts: (dto.parts || []).map((p) => ({
        id: p.partId,
        name: p.name,
        qty: Number(p.quantity),
        price: Number(p.cost),
      })),
    };
  }

  // Converts the frontend task shape to backend create/update request shape.
  function toRepairTaskPayload(task) {
    return {
      name: task.name,
      laborCost: task.laborCost,
      estimatedDurationInMins: task.durationMin,
      parts: task.parts.map((p) => ({
        partId: p.id || null,
        name: p.name,
        quantity: p.qty,
        cost: p.price,
      })),
    };
  }

  window.RepairTaskMappers = {
    mapRepairTask,
    toRepairTaskPayload,
  };
})();
