(function () {
  const I = window.ICONS;
  const { openModal, toast } = window.UI;
  const { cloneTemplate, templateFragment } = window.RepairTaskDom;
  const { toRepairTaskPayload } = window.RepairTaskMappers;
  const { validateRepairTask, showErrors } = window.RepairTaskValidators;

  // Opens the create/edit repair task modal.
  function openTaskForm(task) {
    const isEdit = !!task;
    const parts = task ? task.parts.map((part) => ({ ...part })) : [];

    const modal = openModal({
      title: isEdit ? "Edit repair task" : "New repair task",
      subtitle: "Reusable definition stored in your shop catalog",
      size: "xl",
      body: templateFragment("repair-task-modal-body-template"),
      footer: templateFragment("repair-task-modal-footer-template"),
    });

    fillTaskForm(modal.root, task, isEdit);
    renderParts(modal.root, parts);

    modal.root.querySelector("#add-part").addEventListener("click", () => {
      parts.push({ name: "", qty: 1, price: 1 });
      renderParts(modal.root, parts);
    });
    modal.root.querySelector("[data-cancel]").addEventListener("click", modal.close);
    modal.root.querySelector("[data-save]").addEventListener("click", () => saveTask(modal, task, parts, isEdit));
  }

  // Sets initial modal values and icons.
  function fillTaskForm(root, task, isEdit) {
    root.querySelector("#t-name").value = task?.name || "";
    root.querySelector("#t-labor").value = task?.laborCost ?? "";
    root.querySelector("#t-dur").value = task?.durationMin ?? "";
    root.querySelector("[data-add-part-icon]").outerHTML = I.plus(13);
    root.querySelector("[data-save]").textContent = isEdit ? "Save changes" : "Create task";
  }

  // Re-renders the editable parts list inside the modal.
  function renderParts(root, parts) {
    const list = root.querySelector("#parts-list");
    root.querySelector("#parts-count").textContent = `${parts.length} part${parts.length === 1 ? "" : "s"} attached`;

    if (parts.length === 0) {
      const empty = cloneTemplate("repair-task-empty-parts-template");
      empty.querySelector("[data-empty-part-icon]").outerHTML = I.plus(18);
      list.replaceChildren(empty);
      root.querySelector("#add-part-empty").addEventListener("click", () => {
        parts.push({ name: "", qty: 1, price: 1 });
        renderParts(root, parts);
      });
      return;
    }

    list.replaceChildren(...parts.map((part, index) => renderPartRow(part, index)));
    bindPartInputs(root, parts);
  }

  // Builds one editable part row.
  function renderPartRow(part, index) {
    const row = cloneTemplate("repair-task-part-row-template");
    row.querySelector('[data-p="name"]').value = part.name;
    row.querySelector('[data-p="qty"]').value = part.qty;
    row.querySelector('[data-p="price"]').value = part.price;
    row.querySelectorAll("input[data-p]").forEach((input) => {
      input.dataset.i = index;
    });
    const del = row.querySelector("[data-rm]");
    del.dataset.rm = index;
    del.querySelector("[data-part-delete-icon]").outerHTML = I.trash(13);
    return row;
  }

  // Keeps the local parts array synced with part inputs and remove buttons.
  function bindPartInputs(root, parts) {
    root.querySelectorAll("input[data-p]").forEach((input) => {
      input.addEventListener("input", () => {
        const index = Number(input.dataset.i);
        const key = input.dataset.p;
        parts[index][key] = key === "name" ? input.value : Number(input.value);
      });
    });

    root.querySelectorAll("[data-rm]").forEach((btn) => {
      btn.addEventListener("click", () => {
        parts.splice(Number(btn.dataset.rm), 1);
        renderParts(root, parts);
      });
    });
  }

  // Validates and sends create/update request to the backend.
  function saveTask(modal, task, parts, isEdit) {
    const next = readTaskForm(modal.root, task, parts);
    const errs = validateRepairTask(next);

    showErrors(modal.root, errs);
    if (Object.keys(errs).length) return;

    const request = isEdit
      ? window.API.repairTasks.update(task.id, toRepairTaskPayload(next))
      : window.API.repairTasks.create(toRepairTaskPayload(next));

    request
      .then(() => {
        modal.close();
        toast(isEdit ? "Repair task updated" : "Repair task created");
        window.RepairTasksPage.loadTasks();
      })
      .catch((err) => {
        console.error(err);
        toast(isEdit ? "Could not update repair task" : "Could not create repair task");
      });
  }

  // Reads current modal input values into the frontend repair task shape.
  function readTaskForm(root, task, parts) {
    return {
      id: task?.id || null,
      name: root.querySelector("#t-name").value.trim(),
      durationMin: Number(root.querySelector("#t-dur").value),
      laborCost: Number(root.querySelector("#t-labor").value),
      parts: parts
        .filter((part) => part.name.trim())
        .map((part) => ({
          id: part.id || null,
          name: part.name.trim(),
          qty: Number(part.qty) || 1,
          price: Number(part.price) || 1,
        })),
    };
  }

  window.RepairTaskForms = {
    openTaskForm,
  };
})();
