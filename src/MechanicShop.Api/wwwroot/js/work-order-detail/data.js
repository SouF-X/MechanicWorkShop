(function () {
  const STATES = ["Scheduled", "InProgress", "Completed", "Cancelled"];

  // Loads detail from the backend, then fills optional customer/invoice data.
  function loadDetail(id) {
    if (!id) return Promise.resolve(null);

    return window.API.workOrders
      .getById(id)
      .then((workOrder) => hydrateCustomer(mapBackendDetail(workOrder)))
      .then((detail) => {
        if (!detail.workOrder.invoiceId) {
          return detail;
        }

        return window.API.invoices
          .getById(detail.workOrder.invoiceId)
          .then((invoice) => ({ ...detail, invoice: mapInvoice(invoice) }))
          .catch(() => detail);
      });
  }

  // Converts backend WorkOrderDto into the view model used by the renderer.
  function mapBackendDetail(dto) {
    const state = STATES[Number(dto.state)] || "Scheduled";
    const customer = dto.customer || {};
    const vehicle = dto.vehicle || {};
    const tasks = (dto.repairTasks || []).map((task) => ({
      status: state === "Completed" ? "Done" : "Open",
      def: {
        id: task.repairTaskId,
        name: task.name,
        laborCost: Number(task.laborCost || 0),
        durationMin: Number(task.estimatedDurationInMins || 0),
        parts: (task.parts || []).map((part) => ({ name: part.name, qty: Number(part.quantity || 0), price: Number(part.cost || 0) })),
      },
    }));

    return {
      workOrder: {
        id: dto.workOrderId,
        number: dto.workOrderNumber,
        state,
        bay: "Bay " + (Number(dto.spot) + 1),
        scheduledAt: dto.startAtUtc,
        nextAction: nextActionFor(state),
        invoiceId: dto.invoiceId,
      },
      customer: {
        name: customer.name || "Customer",
        phone: customer.phoneNumber || "-",
        email: customer.email || "-",
      },
      vehicle: {
        id: vehicle.vehicleId,
        year: vehicle.year || "",
        make: vehicle.make || "",
        model: vehicle.model || "",
        plate: vehicle.licensePlate || "-",
      },
      technician: { name: dto.labor?.name || "Unassigned", role: "Labor" },
      tasks,
      labor: Number(dto.totalLaborCost || 0),
      parts: Number(dto.totalPartCost || 0),
      invoice: null,
    };
  }

  // Backward-compatible fallback: if an older API response has no customer object,
  // find the customer from the vehicle id using the existing Customers endpoint.
  function hydrateCustomer(detail) {
    const hasCustomer = detail.customer.name !== "Customer" || detail.customer.phone !== "-" || detail.customer.email !== "-";
    if (hasCustomer || !detail.vehicle.id || !window.API.customers?.list) {
      return Promise.resolve(detail);
    }

    return window.API.customers
      .list()
      .then((customers) => {
        const owner = customers.find((customer) =>
          (customer.vehicles || []).some((vehicle) => vehicle.vehicleId === detail.vehicle.id));

        if (!owner) return detail;

        return {
          ...detail,
          customer: {
            name: owner.name || "Customer",
            phone: owner.phoneNumber || "-",
            email: owner.email || "-",
          },
        };
      })
      .catch(() => detail);
  }

  function mapInvoice(dto) {
    return {
      id: dto.invoiceId,
      number: dto.invoiceNumber,
      status: dto.paymentStatus || "Unpaid",
      issuedAt: dto.issuedAtUtc,
      taxAmount: Number(dto.taxAmount || 0),
      total: Number(dto.total || 0),
    };
  }

  // Human text for current backend state.
  function nextActionFor(state) {
    if (state === "Scheduled") return "Start the work order when the vehicle is in bay.";
    if (state === "InProgress") return "Complete the work order after tasks are done.";
    if (state === "Completed") return "Issue an invoice if one has not been created.";
    return "No next action.";
  }

  window.WorkOrderDetailData = { loadDetail };
})();
