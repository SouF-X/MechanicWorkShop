(function () {
  const I = window.ICONS;
  const { confirmDialog, toast, stateChip } = window.UI;
  const { cloneTemplate } = window.WorkOrderDom;

  const STATES = ["All", "Scheduled", "InProgress", "Completed", "Cancelled"];

  // Renders work orders table, filters, pagination, and row events.
  function render() {
    const page = window.WorkOrdersPage;
    const state = page.state;
    const body = page.body;
    const pages = Math.max(1, state.totalPages || 1);

    body.replaceChildren(cloneTemplate("work-orders-page-template"));
    body.querySelector("[data-search-icon]").outerHTML = I.search(14);
    body.querySelector("[data-filter-icon]").innerHTML = I.filter(13);
    body.querySelector("#wo-q").value = state.q;

    renderFilters(body, state.stateFilter);
    renderRows(body, state.list);

    if (!window.UI.isManager()) {
      body.querySelectorAll(".wo-action").forEach((el) => el.remove());
    }

    body.querySelector("[data-pagination-summary]").textContent = "Showing " + state.list.length + " of " + state.totalCount;
    body.querySelector("[data-page-label]").textContent = state.page + " / " + pages;
    body.querySelector("#pg-prev").disabled = state.page === 1;
    body.querySelector("#pg-next").disabled = state.page === pages;

    bindEvents(body);
  }

  // Renders state filter buttons.
  function renderFilters(body, selected) {
    body.querySelector("[data-state-filters]").replaceChildren(
      ...STATES.map((item) => {
        const btn = cloneTemplate("work-order-filter-template");
        btn.classList.toggle("active", selected === item);
        btn.dataset.st = item;
        btn.textContent = item === "InProgress" ? "In Progress" : item;
        return btn;
      }),
    );
  }

  // Renders table rows or empty state.
  function renderRows(body, list) {
    const tbody = body.querySelector("[data-work-orders-body]");
    if (list.length === 0) {
      tbody.replaceChildren(cloneTemplate("work-order-empty-template"));
      return;
    }
    tbody.replaceChildren(...list.map(renderRow));
  }

  // Builds one work-order row.
  function renderRow(workOrder) {
    const row = cloneTemplate("work-order-row-template");
    const link = row.querySelector("[data-wo-link]");
    link.href = "work-order-detail.html?id=" + workOrder.id;
    link.textContent = workOrder.number;
    row.querySelector("[data-wo-bay]").textContent = workOrder.bay;
    row.querySelector("[data-wo-customer]").textContent = workOrder.customer;
    row.querySelector("[data-wo-vehicle]").textContent = workOrder.vehicle + (workOrder.plate ? " - " + workOrder.plate : "");
    row.querySelector("[data-wo-technician]").textContent = workOrder.technician;
    row.querySelector("[data-wo-scheduled]").textContent = new Date(workOrder.scheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    row.querySelector("[data-wo-tasks]").textContent = workOrder.tasksCount + " task" + (workOrder.tasksCount === 1 ? "" : "s");
    row.querySelector("[data-wo-state]").replaceChildren(stateChip(workOrder.state));

    const invoiceCell = row.querySelector("[data-wo-invoice]");
    if (workOrder.invoiceId) {
      const invoiceText = cloneTemplate("work-order-invoice-number-template");
      invoiceText.textContent = workOrder.invoiceNumber;
      invoiceCell.replaceChildren(invoiceText);
    } else {
      invoiceCell.replaceChildren(cloneTemplate(workOrder.state === "Completed" ? "work-order-invoice-ready-template" : "work-order-invoice-empty-template"));
    }

    const edit = row.querySelector("[data-edit]");
    edit.dataset.edit = workOrder.id;
    edit.innerHTML = I.pencil(13);
    edit.disabled = workOrder.state !== "Scheduled";
    edit.title = workOrder.state === "Scheduled" ? "Modify schedule, bay, and technician" : "Only scheduled work orders can be modified";

    const del = row.querySelector("[data-del]");
    del.dataset.del = workOrder.id;
    del.innerHTML = I.trash(13);
    return row;
  }

  // Binds search/filter/pagination/delete events.
  function bindEvents(body) {
    const page = window.WorkOrdersPage;
    const state = page.state;

    body.querySelector("#wo-q").addEventListener("input", (e) => {
      state.q = e.target.value;
      state.page = 1;
      page.loadWorkOrders();
    });
    body.querySelectorAll("[data-st]").forEach((btn) => btn.addEventListener("click", () => page.setStateFilter(btn.dataset.st)));
    body.querySelector("#pg-prev").addEventListener("click", () => page.changePage(-1));
    body.querySelector("#pg-next").addEventListener("click", () => page.changePage(1));
    body.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => window.WorkOrderForms.openEditWoForm(btn.dataset.edit));
    });
    body.querySelectorAll("[data-del]").forEach((btn) => btn.addEventListener("click", () => deleteWorkOrder(btn.dataset.del)));
  }

  // Deletes one work order through backend then reloads table.
  function deleteWorkOrder(id) {
    confirmDialog({
      title: "Delete this work order?",
      description: "The work order and all its task assignments will be permanently removed. This cannot be undone.",
      confirmLabel: "Delete work order",
      onConfirm: () => {
        window.API.workOrders
          .remove(id)
          .then(() => {
            toast("Work order deleted");
            window.WorkOrdersPage.loadWorkOrders();
          })
          .catch((err) => {
            console.error(err);
            toast("Could not delete work order");
          });
      },
    });
  }

  window.WorkOrderRender = { render };
})();
