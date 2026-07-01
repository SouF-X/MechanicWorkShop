(function () {
  const I = window.ICONS;
  const { toast, stateChip, invoiceChip, initials, openModal } = window.UI;
  const { cloneTemplate } = window.WorkOrderDetailDom;

  // Renders not-found fallback.
  function renderNotFound(body) {
    body.replaceChildren(cloneTemplate("work-order-not-found-template"));
  }

  // Renders full work order detail screen.
  function renderDetail(body, detail) {
    const { workOrder, customer, vehicle, technician, tasks, labor, parts, invoice } = detail;

    body.replaceChildren(cloneTemplate("work-order-detail-page-template"));
    renderCustomerVehicle(body, customer, vehicle);
    renderTasks(body, tasks, labor, parts, workOrder);
    renderInvoice(body, invoice);
    renderStatus(body, workOrder, technician);
    bindActions(workOrder, invoice, tasks);
  }

  // Fills customer and vehicle card.
  function renderCustomerVehicle(body, customer, vehicle) {
    body.querySelector("[data-customer-icon]").innerHTML = I.user(18);
    body.querySelector("[data-phone-icon]").innerHTML = I.phone(13);
    body.querySelector("[data-mail-icon]").innerHTML = I.mail(13);
    body.querySelector("[data-car-icon]").innerHTML = I.car(18);
    body.querySelector("[data-plate-icon]").innerHTML = I.fileText(13);
    body.querySelector("[data-mileage-icon]").innerHTML = I.clock(13);

    body.querySelector("[data-customer-name]").textContent = customer.name;
    body.querySelector("[data-customer-phone]").textContent = customer.phone;
    body.querySelector("[data-customer-email]").textContent = customer.email;
    body.querySelector("[data-vehicle-name]").textContent = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");
    body.querySelector("[data-vehicle-id]").textContent = "Plate " + vehicle.plate;
    body.querySelector("[data-vehicle-mileage]").textContent = "Mileage not recorded";
  }

  // Fills repair task list and totals.
  function renderTasks(body, tasks, labor, parts, workOrder) {
    const totalMinutes = tasks.reduce((sum, task) => sum + task.def.durationMin, 0);
    body.querySelector("[data-task-summary]").textContent = tasks.length + " task" + (tasks.length === 1 ? "" : "s") + " · ~" + totalMinutes + " min";
    body.querySelector("[data-modify-icon]").innerHTML = I.pencil(12);

    const modifyButton = body.querySelector("[data-modify-tasks]");
    const canModifyTasks = workOrder.state === "Scheduled";
    modifyButton.disabled = !canModifyTasks;
    modifyButton.title = canModifyTasks
      ? "Modify repair tasks"
      : "Repair tasks can only be modified while the work order is scheduled.";

    body.querySelector("[data-task-list]").replaceChildren(...tasks.map(renderTaskRow));
    body.querySelector("[data-labor-total]").textContent = "$" + labor.toFixed(2);
    body.querySelector("[data-parts-total]").textContent = "$" + parts.toFixed(2);
    body.querySelector("[data-grand-total]").textContent = "$" + (labor + parts).toFixed(2);
  }

  // Builds one task row.
  function renderTaskRow(task) {
    const row = cloneTemplate("work-order-task-row-template");
    row.querySelector("[data-task-icon]").innerHTML = I.wrench(14);
    row.querySelector("[data-task-title]").textContent = task.def.name;
    const total = task.def.laborCost + task.def.parts.reduce((sum, part) => sum + part.qty * part.price, 0);
    row.querySelector("[data-task-price]").textContent = "$" + total.toFixed(2);
    const partsText = task.def.parts.length > 0 ? " · Parts: " + task.def.parts.map((part) => part.qty + "× " + part.name).join(", ") : "";
    row.querySelector("[data-task-meta]").textContent = "~" + task.def.durationMin + " min · Labor $" + task.def.laborCost.toFixed(2) + partsText;
    return row;
  }

  // Renders invoice summary card if invoice exists.
  function renderInvoice(body, invoice) {
    if (!invoice) return;

    const invoiceNode = cloneTemplate("work-order-invoice-template");
    invoiceNode.querySelector("[data-invoice-title]").textContent = "Invoice " + invoice.number;
    invoiceNode.querySelector("[data-invoice-status]").replaceChildren(invoiceChip(invoice.status));
    invoiceNode.querySelector("[data-invoice-issued]").textContent = "Issued " + new Date(invoice.issuedAt).toLocaleDateString() + " · Tax $" + invoice.taxAmount.toFixed(2);
    invoiceNode.querySelector("[data-invoice-total]").textContent = "$" + invoice.total.toFixed(2);

    if (invoice.status === "Unpaid") {
      const paid = document.createElement("button");
      paid.className = "btn btn-success";
      paid.id = "mark-paid";
      paid.textContent = "Mark paid";
      invoiceNode.querySelector("[data-mark-paid-action]").replaceChildren(paid);
    }
    body.querySelector("[data-invoice-section]").replaceChildren(invoiceNode);
  }

  // Fills status, assignment, and schedule cards.
  function renderStatus(body, workOrder, technician) {
    body.querySelector("[data-current-state]").replaceChildren(stateChip(workOrder.state));
    body.querySelector("[data-next-action]").textContent = workOrder.nextAction;
    body.querySelector("[data-tech-initials]").textContent = initials(technician.name);
    body.querySelector("[data-tech-name]").textContent = technician.name;
    body.querySelector("[data-tech-role]").textContent = technician.role;
    body.querySelector("[data-scheduled-at]").textContent = new Date(workOrder.scheduledAt).toLocaleString([], { dateStyle: "full", timeStyle: "short" });
    body.querySelector("[data-bay]").textContent = workOrder.bay;
    body.querySelector("[data-shield-icon]").innerHTML = I.shieldChk(14);

    const startButton = document.getElementById("start");
    const startsTooEarly = new Date(workOrder.scheduledAt).getTime() > Date.now() + 15 * 60 * 1000;
    startButton.disabled = workOrder.state !== "Scheduled" || startsTooEarly;
    startButton.title = startsTooEarly ? "This work order can be started 15 minutes before its scheduled time." : "";

    document.getElementById("complete").disabled = workOrder.state !== "InProgress";
    document.getElementById("cancel-wo").disabled = workOrder.state === "Completed" || workOrder.state === "Cancelled";
  }

  // Binds backend-supported actions.
  function bindActions(workOrder, invoice, tasks) {
    document.getElementById("issue-inv")?.addEventListener("click", () => {
      window.API.invoices
        .issueForWorkOrder(workOrder.id)
        .then(() => {
          toast("Invoice issued for " + workOrder.number, "success");
          location.reload();
        })
        .catch(() => toast("Could not issue invoice", "error"));
    });

    document.getElementById("mark-paid")?.addEventListener("click", () => {
      if (!invoice?.id) {
        toast("Backend invoice id required to mark paid", "error");
        return;
      }
      window.API.invoices.settle(invoice.id).then(() => toast("Marked " + invoice.number + " as paid", "success")).catch(() => toast("Could not mark invoice as paid", "error"));
    });

    document.getElementById("start")?.addEventListener("click", () => updateState(workOrder, 1, "Work order started"));
    document.getElementById("complete")?.addEventListener("click", () => updateState(workOrder, 2, "Work order completed"));
    document.getElementById("cancel-wo")?.addEventListener("click", () => updateState(workOrder, 3, "Work order cancelled"));
    document.querySelector("[data-modify-tasks]")?.addEventListener("click", () => openRepairTaskModal(workOrder, tasks));
  }

  // Opens a simple repair-task selector and replaces the work order task list.
  function openRepairTaskModal(workOrder, currentTasks) {
    if (workOrder.state !== "Scheduled") {
      toast("Repair tasks can only be modified while the work order is scheduled", "error");
      return;
    }

    const selectedIds = new Set(currentTasks.map((task) => task.def.id));
    const body = document.createElement("div");
    body.className = "form-pair";

    const grid = document.createElement("div");
    grid.className = "task-grid";
    grid.textContent = "Loading repair tasks...";

    const hint = document.createElement("div");
    hint.className = "field-hint";
    body.append(grid, hint);
    updateTaskHint(hint, selectedIds.size);

    const footer = document.createElement("div");
    footer.className = "action-grid-2";
    const cancel = document.createElement("button");
    cancel.className = "btn btn-ghost";
    cancel.textContent = "Cancel";
    const save = document.createElement("button");
    save.className = "btn btn-primary";
    save.textContent = "Save repair tasks";
    footer.append(cancel, save);

    const modal = openModal({
      title: "Modify repair tasks",
      subtitle: "Choose the repair tasks for " + workOrder.number,
      size: "md",
      body,
      footer,
    });

    cancel.addEventListener("click", modal.close);

    window.API.repairTasks
      .list()
      .then((repairTasks) => {
        grid.replaceChildren(...repairTasks.map((task) => repairTaskOption(task, selectedIds, hint)));
      })
      .catch((err) => {
        console.error(err);
        grid.textContent = "Could not load repair tasks.";
      });

    save.addEventListener("click", () => {
      const repairTaskIds = [...selectedIds];
      if (repairTaskIds.length === 0) {
        toast("Select at least one repair task", "error");
        return;
      }

      window.API.workOrders
        .updateRepairTasks(workOrder.id, { repairTaskIds })
        .then(() => {
          toast("Repair tasks updated", "success");
          modal.close();
          location.reload();
        })
        .catch((err) => {
          console.error(err);
          toast(err.message || "Could not update repair tasks", "error");
        });
    });
  }

  function repairTaskOption(task, selectedIds, hint) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "task-btn";
    btn.dataset.task = task.repairTaskId;
    btn.classList.toggle("active", selectedIds.has(task.repairTaskId));

    const name = document.createElement("span");
    name.textContent = task.name;

    const price = document.createElement("span");
    price.className = "price tabular";
    price.textContent = "$" + Number(task.laborCost || task.totalCost || 0).toFixed(0);

    btn.append(name, price);
    btn.addEventListener("click", () => {
      if (selectedIds.has(task.repairTaskId)) selectedIds.delete(task.repairTaskId);
      else selectedIds.add(task.repairTaskId);
      btn.classList.toggle("active");
      updateTaskHint(hint, selectedIds.size);
    });

    return btn;
  }

  function updateTaskHint(hint, count) {
    hint.textContent = count + " selected";
  }

  // Updates backend work order state.
  function updateState(workOrder, state, successMessage) {
    window.API.workOrders
      .updateState(workOrder.id, { state })
      .then(() => {
        toast(successMessage || "State updated", "success");
        location.reload();
      })
      .catch((err) => {
        console.error(err);
        toast(err.message || "Could not update state", "error");
      });
  }

  window.WorkOrderDetailRender = { renderNotFound, renderDetail };
})();
