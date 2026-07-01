(function () {
  const { openModal, toast } = window.UI;
  const { cloneTemplate, templateFragment } = window.WorkOrderDom;
  const { mapVehicles, mapLabors, mapRepairTasks } = window.WorkOrderMappers;

  // Opens new work order modal and loads dropdown data from backend.
  function openWoForm() {
    const modal = openModal({
      title: "New work order",
      subtitle: "Create a new scheduled job",
      size: "lg",
      body: templateFragment("work-order-modal-body-template"),
      footer: templateFragment("work-order-modal-footer-template"),
    });

    const formState = { spot: 0, pickedTasks: new Set(), vehicles: [], labors: [], tasks: [] };
    fillStaticFields(modal.root, formState);
    loadFormData(modal, formState);

    modal.root.querySelector("[data-cancel]").addEventListener("click", modal.close);
    modal.root.querySelector("[data-save]").addEventListener("click", () => saveWorkOrder(modal, formState));
  }

  // Sets date/time and spot buttons.
  function fillStaticFields(root, formState) {
    root.querySelector("#f-date").value = new Date().toISOString().slice(0, 10);
    root.querySelector("#f-time").value = "09:00";

    root.querySelector("#f-spot").replaceChildren(
      ...["A", "B", "C", "D"].map((spot, index) => {
        const btn = cloneTemplate("work-order-spot-template");
        btn.dataset.spot = index;
        btn.textContent = spot;
        btn.classList.toggle("active", index === 0);
        btn.addEventListener("click", () => {
          formState.spot = index;
          root.querySelectorAll("[data-spot]").forEach((x) => x.classList.toggle("active", Number(x.dataset.spot) === index));
        });
        return btn;
      }),
    );
  }

  // Loads vehicles, labor, and repair tasks for the modal selects.
  function loadFormData(modal, formState) {
    Promise.all([window.API.customers.list(), window.API.employees.list(), window.API.repairTasks.list()])
      .then(([customers, employees, tasks]) => {
        formState.vehicles = mapVehicles(customers);
        formState.labors = mapLabors(employees);
        formState.tasks = mapRepairTasks(tasks);
        renderFormOptions(modal.root, formState);
      })
      .catch((err) => {
        console.error(err);
        toast("Could not load work order form data");
      });
  }

  // Renders select/task options after backend data arrives.
  function renderFormOptions(root, formState) {
    root.querySelector("#f-veh").replaceChildren(...formState.vehicles.map((vehicle) => new Option(vehicle.label, vehicle.id)));
    root.querySelector("#f-lab").replaceChildren(...formState.labors.map((labor) => new Option(labor.label, labor.id)));
    root.querySelector("#f-tasks").replaceChildren(
      ...formState.tasks.map((task) => {
        const btn = cloneTemplate("work-order-task-template");
        btn.dataset.task = task.id;
        btn.querySelector("[data-task-name]").textContent = task.name;
        btn.querySelector("[data-task-price]").textContent = "$" + task.price;
        btn.addEventListener("click", () => {
          if (formState.pickedTasks.has(task.id)) formState.pickedTasks.delete(task.id);
          else formState.pickedTasks.add(task.id);
          btn.classList.toggle("active");
          root.querySelector("#task-hint").textContent = `${formState.pickedTasks.size} selected`;
        });
        return btn;
      }),
    );
  }

  // Validates and sends create work order request to backend.
  function saveWorkOrder(modal, formState) {
    const errEl = modal.root.querySelector('[data-err="tasks"]');
    errEl.classList.add("hidden");
    if (formState.pickedTasks.size === 0) {
      errEl.textContent = "Select at least one task";
      errEl.classList.remove("hidden");
      return;
    }

    const date = modal.root.querySelector("#f-date").value;
    const time = modal.root.querySelector("#f-time").value;
    const payload = {
      vehicleId: modal.root.querySelector("#f-veh").value,
      laborId: modal.root.querySelector("#f-lab").value,
      spot: formState.spot,
      startAtUtc: new Date(`${date}T${time}:00`).toISOString(),
      repairTaskIds: [...formState.pickedTasks],
    };

    window.API.workOrders
      .create(payload)
      .then(() => {
        modal.close();
        toast("Work order created");
        window.WorkOrdersPage.loadWorkOrders();
      })
      .catch((err) => {
        console.error(err);
        toast(err.message || "Could not create work order");
      });
  }

  // Opens edit modal for schedule, bay/spot, and assigned labor.
  function openEditWoForm(workOrderId) {
    const body = buildEditBody();
    const footer = templateFragment("work-order-modal-footer-template");
    footer.querySelector("[data-save]").textContent = "Save changes";

    const modal = openModal({
      title: "Modify work order",
      subtitle: "Update technician, bay, and appointment time",
      size: "md",
      body,
      footer,
    });

    const formState = { spot: 0, workOrder: null };
    modal.root.querySelector("[data-cancel]").addEventListener("click", modal.close);
    modal.root.querySelector("[data-save]").disabled = true;

    Promise.all([window.API.workOrders.getById(workOrderId), window.API.employees.list()])
      .then(([workOrder, employees]) => {
        if (Number(workOrder.state) !== 0) {
          toast("Only scheduled work orders can be modified");
          modal.close();
          return;
        }

        formState.workOrder = workOrder;
        populateEditForm(modal.root, formState, employees);
        modal.root.querySelector("[data-save]").disabled = false;
      })
      .catch((err) => {
        console.error(err);
        toast("Could not load work order details");
        modal.close();
      });

    modal.root.querySelector("[data-save]").addEventListener("click", () => saveEditedWorkOrder(modal, formState));
  }

  function buildEditBody() {
    const form = document.createElement("form");
    form.className = "form-pair";
    form.innerHTML = `
      <div class="field"><label class="field-label">Labor</label><div class="field-control"><select class="input" id="e-lab"></select></div></div>
      <div class="field"><label class="field-label">Spot</label><div class="field-control spot-grid" id="e-spot"></div></div>
      <div class="form-pair-2">
        <div class="field"><label class="field-label">Start date</label><div class="field-control"><input class="input" id="e-date" type="date"></div></div>
        <div class="field"><label class="field-label">Start time</label><div class="field-control"><input class="input" id="e-time" type="time"></div></div>
      </div>
      <div class="field-hint">Changing time or bay keeps the same work order record. If this is a cancelled appointment, cancel it and create a new work order.</div>
    `;
    return form;
  }

  function populateEditForm(root, formState, employees) {
    const workOrder = formState.workOrder;
    const labors = mapLabors(employees);
    root.querySelector("#e-lab").replaceChildren(...labors.map((labor) => new Option(labor.label, labor.id)));
    if (workOrder.labor?.laborId) {
      root.querySelector("#e-lab").value = workOrder.labor.laborId;
    }

    formState.spot = Number(workOrder.spot || 0);
    root.querySelector("#e-spot").replaceChildren(
      ...["A", "B", "C", "D"].map((spot, index) => {
        const btn = cloneTemplate("work-order-spot-template");
        btn.dataset.spot = index;
        btn.textContent = spot;
        btn.classList.toggle("active", index === formState.spot);
        btn.addEventListener("click", () => {
          formState.spot = index;
          root.querySelectorAll("#e-spot [data-spot]").forEach((x) => x.classList.toggle("active", Number(x.dataset.spot) === index));
        });
        return btn;
      }),
    );

    const start = new Date(workOrder.startAtUtc);
    root.querySelector("#e-date").value = toDateInputValue(start);
    root.querySelector("#e-time").value = toTimeInputValue(start);
  }

  function saveEditedWorkOrder(modal, formState) {
    if (!formState.workOrder) return;

    const laborId = modal.root.querySelector("#e-lab").value;
    const date = modal.root.querySelector("#e-date").value;
    const time = modal.root.querySelector("#e-time").value;

    if (!laborId || !date || !time) {
      toast("Choose labor, date, and time");
      return;
    }

    const newStartAtUtc = new Date(`${date}T${time}:00`).toISOString();

    Promise.all([
      window.API.workOrders.relocate(formState.workOrder.workOrderId, {
        newStartAtUtc,
        newSpot: formState.spot,
      }),
      window.API.workOrders.assignLabor(formState.workOrder.workOrderId, { laborId }),
    ])
      .then(() => {
        modal.close();
        toast("Work order updated");
        window.WorkOrdersPage.loadWorkOrders();
      })
      .catch((err) => {
        console.error(err);
        toast(err.message || "Could not update work order");
      });
  }

  function toDateInputValue(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function toTimeInputValue(date) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  window.WorkOrderForms = { openWoForm, openEditWoForm };
})();
