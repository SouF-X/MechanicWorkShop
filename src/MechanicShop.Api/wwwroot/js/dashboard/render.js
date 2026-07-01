(function () {
  const I = window.ICONS;
  const { stateChip } = window.UI;
  const { cloneTemplate } = window.DashboardDom;

  // Mounts dashboard base layout into the page body.
  function mount(body) {
    body.replaceChildren(document.getElementById("dashboard-page-template").content.cloneNode(true));
  }

  // Renders all dashboard sections.
  function renderAll(body, data, stats) {
    renderStats(body, stats);
    renderAttention(body, data);
    renderActiveWorkOrders(body, data);
    renderCapacity(body, data.capacity);
    renderActivity(body, data.activity);
  }

  // Renders top KPI cards.
  function renderStats(root, stats) {
    const items = [
      { label: "Today", value: stats.today, icon: "clipboard", tone: "primary" },
      { label: "Scheduled", value: stats.scheduled, icon: "calendar", tone: "info" },
      { label: "In progress", value: stats.inProgress, icon: "loader", tone: "accent" },
      { label: "Completed", value: stats.completed, icon: "check2", tone: "success" },
      { label: "Cancelled", value: stats.cancelled, icon: "xCircle", tone: "muted" },
      { label: "Est. revenue", value: `$${Math.round(stats.estRevenue)}`, icon: "dollar", tone: "primary" },
      { label: "Unpaid", value: `$${Math.round(stats.unpaidTotal)}`, icon: "alert", tone: "danger" },
    ];

    root.querySelector("[data-stats]").replaceChildren(
      ...items.map((item) => {
        const node = cloneTemplate("dashboard-stat-template");
        node.querySelector("[data-stat-label]").textContent = item.label;
        node.querySelector("[data-stat-value]").textContent = item.value;
        const icon = node.querySelector("[data-stat-icon]");
        icon.classList.add(item.tone);
        icon.innerHTML = I[item.icon](14);
        return node;
      }),
    );
  }

  // Renders flagged attention list.
  function renderAttention(root, data) {
    root.querySelector("[data-attention-count]").textContent = `${data.attention.length} item${data.attention.length === 1 ? "" : "s"} flagged`;
    const list = root.querySelector("[data-attention-list]");

    if (data.attention.length === 0) {
      list.replaceChildren(emptyItem("All clear. Nothing flagged."));
      return;
    }

    list.replaceChildren(
      ...data.attention.slice(0, 6).map((item) => {
        const node = cloneTemplate("dashboard-attention-template");
        node.querySelector("[data-attention-tone]").classList.add(item.tone);
        node.querySelector("[data-attention-number]").textContent = item.w?.number ?? item.invoice?.number ?? "";
        node.querySelector("[data-attention-kind]").textContent = item.kind;

        if (item.w) {
          const customer = item.w.customer || { name: "Customer" };
          const vehicle = item.w.vehicle || {};
          node.querySelector("[data-attention-sub]").textContent = `${customer.name} - ${[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}`;
          const link = node.querySelector("[data-attention-link]");
          link.href = `work-order-detail.html?id=${item.w.id}`;
          link.innerHTML = I.arrowUR(14);
        }

        if (item.invoice) {
          node.querySelector("[data-attention-sub]").textContent = `${item.invoice.workOrderNumber} - $${item.invoice.total.toFixed(2)} due`;
          const link = node.querySelector("[data-attention-link]");
          link.href = "invoices.html";
          link.innerHTML = I.arrowUR(14);
        }

        return node;
      }),
    );
  }

  // Renders today's active work orders table.
  function renderActiveWorkOrders(root, data) {
    const tbody = root.querySelector("[data-active-workorders]");

    if (data.todays.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.className = "empty";
      cell.textContent = "No work orders scheduled for today.";
      row.appendChild(cell);
      tbody.replaceChildren(row);
      return;
    }

    tbody.replaceChildren(
      ...data.todays.slice(0, 6).map((workOrder) => {
        const customer = workOrder.customer || { name: "Customer" };
        const vehicle = workOrder.vehicle || {};
        const technician = workOrder.technician || { name: "Unassigned", role: "Labor" };
        const row = cloneTemplate("dashboard-workorder-template");

        const link = row.querySelector("[data-workorder-link]");
        link.href = `work-order-detail.html?id=${workOrder.id}`;
        link.textContent = workOrder.number;
        row.querySelector("[data-workorder-bay]").textContent = workOrder.bay;
        row.querySelector("[data-workorder-customer]").textContent = customer.name;
        row.querySelector("[data-workorder-vehicle]").textContent = `${[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")} - ${vehicle.plate || "-"}`;
        row.querySelector("[data-workorder-tech]").textContent = technician.name;
        row.querySelector("[data-workorder-role]").textContent = technician.role;
        row.querySelector("[data-workorder-state]").replaceChildren(stateChip(workOrder.state));
        row.querySelector("[data-workorder-next]").textContent = workOrder.nextAction;
        return row;
      }),
    );
  }

  // Renders bay capacity cards.
  function renderCapacity(root, capacity) {
    root.querySelector("[data-capacity-list]").replaceChildren(
      ...capacity.map((item) => {
        const node = cloneTemplate("dashboard-capacity-template");
        node.querySelector("[data-capacity-bay]").textContent = item.bay;
        node.querySelector("[data-capacity-meta]").textContent = `${item.booked} job${item.booked === 1 ? "" : "s"} - ${item.pct}%`;
        const fill = node.querySelector("[data-capacity-fill]");
        fill.style.width = `${item.pct}%`;
        if (item.pct >= 75) fill.classList.add("warn");
        return node;
      }),
    );
  }

  // Renders recent activity feed.
  function renderActivity(root, activity) {
    root.querySelector("[data-activity-list]").replaceChildren(
      ...activity.map((item) => {
        const node = cloneTemplate("dashboard-activity-template");
        node.querySelector("[data-activity-icon]").innerHTML = item.kind === "invoice" ? I.fileText(14) : I.activity(14);
        node.querySelector("[data-activity-message]").textContent = item.text;
        node.querySelector("[data-activity-time]").textContent = item.at;
        return node;
      }),
    );
  }

  // Creates a simple empty list item.
  function emptyItem(message) {
    const item = document.createElement("li");
    item.className = "empty";
    item.textContent = message;
    return item;
  }

  window.DashboardRender = { mount, renderAll };
})();
