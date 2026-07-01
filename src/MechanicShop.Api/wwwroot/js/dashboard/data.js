(function () {
  const STATES = ["Scheduled", "InProgress", "Completed", "Cancelled"];

  function emptyDashboardData() {
    return {
      attention: [],
      todays: [],
      capacity: [
        { bay: "Bay 1", booked: 0, pct: 0 },
        { bay: "Bay 2", booked: 0, pct: 0 },
        { bay: "Bay 3", booked: 0, pct: 0 },
        { bay: "Bay 4", booked: 0, pct: 0 },
      ],
      activity: [],
    };
  }

  function emptyStats() {
    return {
      today: 0,
      scheduled: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      estRevenue: 0,
      unpaidTotal: 0,
    };
  }

  // Converts backend dashboard stats to the card values used by the UI.
  function mapBackendStats(stats) {
    return {
      today: Number(stats.total ?? 0),
      scheduled: Number(stats.scheduled ?? 0),
      inProgress: Number(stats.inProgress ?? 0),
      completed: Number(stats.completed ?? 0),
      cancelled: Number(stats.cancelled ?? 0),
      estRevenue: Number(stats.totalRevenue ?? 0),
      unpaidTotal: Number(stats.unpaidTotal ?? 0),
    };
  }

  // Loads dashboard sections that need real work order/invoice details.
  function loadDashboardData() {
    return Promise.all([
      window.API.workOrders.list({ page: 1, pageSize: 100 }),
      window.API.invoices.list().catch(() => []),
    ]).then(([workOrderPage, invoices]) => {
      const workOrders = pageItems(workOrderPage).map(mapWorkOrder);
      const invoiceRows = invoices.map(mapInvoice);
      const todayOrders = workOrders
        .filter((workOrder) => isToday(workOrder.scheduledAt))
        .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
      const capacityOrders = todayOrders.filter((workOrder) => workOrder.state !== "Cancelled");

      return {
        attention: buildAttention(todayOrders, invoiceRows),
        todays: todayOrders,
        capacity: buildCapacity(capacityOrders),
        activity: buildActivity(workOrders, invoiceRows),
        unpaidTotal: invoiceRows
          .filter((invoice) => invoice.status === "Unpaid")
          .reduce((sum, invoice) => sum + invoice.total, 0),
      };
    });
  }

  function pageItems(result) {
    return result.items || result.Items || [];
  }

  function mapWorkOrder(dto) {
    const vehicle = dto.vehicle || {};
    const state = STATES[Number(dto.state)] || String(dto.state || "Scheduled");
    return {
      id: dto.workOrderId,
      number: dto.workOrderNumber,
      invoiceId: dto.invoiceId,
      customer: { name: dto.customer || "Customer" },
      vehicle: {
        year: vehicle.year || "",
        make: vehicle.make || "",
        model: vehicle.model || "",
        plate: vehicle.licensePlate || "-",
      },
      technician: { name: dto.labor || "Unassigned", role: "Labor" },
      state,
      spot: Number(dto.spot || 0),
      bay: "Bay " + (Number(dto.spot || 0) + 1),
      scheduledAt: dto.startAtUtc,
      nextAction: nextActionFor(state, dto.invoiceId),
    };
  }

  function mapInvoice(dto) {
    return {
      id: dto.invoiceId,
      number: dto.invoiceNumber,
      status: dto.paymentStatus || "Unpaid",
      total: Number(dto.total || 0),
      issuedAt: dto.issuedAtUtc,
      workOrderId: dto.workOrderId,
      workOrderNumber: dto.workOrderNumber || "Work order",
    };
  }

  function buildAttention(todayOrders, invoices) {
    const now = Date.now();
    const attention = [];

    todayOrders.forEach((workOrder) => {
      const start = new Date(workOrder.scheduledAt).getTime();

      if (workOrder.state === "Scheduled" && start <= now + 15 * 60 * 1000) {
        attention.push({ tone: "info", kind: start < now ? "Scheduled time passed" : "Ready to start soon", w: workOrder });
      }

      if (workOrder.state === "InProgress") {
        attention.push({ tone: "warn", kind: "Work order in progress", w: workOrder });
      }

      if (workOrder.state === "Completed" && !workOrder.invoiceId) {
        attention.push({ tone: "danger", kind: "Invoice needed", w: workOrder });
      }
    });

    invoices
      .filter((invoice) => invoice.status === "Unpaid")
      .forEach((invoice) => {
        attention.push({
          tone: "danger",
          kind: "Invoice unpaid",
          invoice,
        });
      });

    return attention;
  }

  function buildCapacity(todayOrders) {
    const bays = [0, 1, 2, 3].map((spot) => {
      const booked = todayOrders.filter((workOrder) => workOrder.spot === spot).length;
      return {
        bay: "Bay " + (spot + 1),
        booked,
        pct: Math.min(100, booked * 25),
      };
    });

    return bays;
  }

  function buildActivity(workOrders, invoices) {
    const invoiceActivity = invoices.map((invoice) => ({
      kind: "invoice",
      text: `${invoice.number} ${invoice.status.toLowerCase()} · ${invoice.workOrderNumber}`,
      at: relativeTime(invoice.issuedAt),
      date: new Date(invoice.issuedAt).getTime(),
    }));

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const workOrderActivity = workOrders
      .map((workOrder) => ({
        kind: "workorder",
        text: `${workOrder.number} · ${displayState(workOrder.state)} · ${workOrder.customer.name}`,
        at: relativeTime(workOrder.scheduledAt),
        date: new Date(workOrder.scheduledAt).getTime(),
      }));

    return [...invoiceActivity, ...workOrderActivity]
      .filter((item) => Number.isFinite(item.date) && item.date <= Date.now() && item.date >= oneDayAgo)
      .sort((a, b) => b.date - a.date)
      .slice(0, 6);
  }

  function isToday(value) {
    const date = new Date(value);
    const now = new Date();
    return date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth()
      && date.getDate() === now.getDate();
  }

  function relativeTime(value) {
    const date = new Date(value);
    const diff = Date.now() - date.getTime();
    const abs = Math.abs(diff);
    const suffix = diff >= 0 ? "ago" : "from now";
    const minutes = Math.round(abs / 60000);

    if (!Number.isFinite(minutes)) return "";
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ${suffix}`;

    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hr ${suffix}`;

    return date.toLocaleDateString([], { dateStyle: "medium" });
  }

  function displayState(state) {
    return state === "InProgress" ? "In Progress" : state;
  }

  // Human text for current backend state.
  function nextActionFor(state, invoiceId) {
    if (state === "Scheduled") return "Start when vehicle is in bay.";
    if (state === "InProgress") return "Complete after tasks are done.";
    if (state === "Completed") return invoiceId ? "Invoice already issued." : "Issue invoice.";
    return "No next action.";
  }

  window.DashboardData = { emptyDashboardData, emptyStats, mapBackendStats, loadDashboardData };
})();
