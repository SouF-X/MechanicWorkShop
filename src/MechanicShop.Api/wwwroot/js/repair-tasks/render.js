(function () {
  const I = window.ICONS;
  const { confirmDialog, toast } = window.UI;
  const { cloneTemplate } = window.RepairTaskDom;

  // Renders the repair task catalog table and rebinds page events.
  function render() {
    const page = window.RepairTasksPage;
    const state = page.state;
    const body = page.body;
    const needle = state.q.trim().toLowerCase();
    const filtered = !needle
      ? state.list
      : state.list.filter((task) =>
          task.name.toLowerCase().includes(needle) ||
          task.parts.some((part) => part.name.toLowerCase().includes(needle)),
        );

    body.replaceChildren(cloneTemplate("repair-tasks-page-template"));
    body.querySelector("[data-catalog-count]").textContent = filtered.length + " of " + state.list.length + " tasks";
    body.querySelector("[data-search-icon]").outerHTML = I.search(14);
    body.querySelector("#rt-q").value = state.q;

    renderRows(body, filtered);
    bindEvents(body);
  }

  // Draws the filtered repair task rows or empty state.
  function renderRows(body, filtered) {
    const tbody = body.querySelector("[data-repair-task-body]");

    if (filtered.length === 0) {
      tbody.replaceChildren(cloneTemplate("repair-task-empty-template"));
      return;
    }

    tbody.replaceChildren(...filtered.map(renderRow));
  }

  // Builds one repair task table row.
  function renderRow(task) {
    const partTotal = task.parts.reduce((sum, part) => sum + part.qty * part.price, 0);
    const row = cloneTemplate("repair-task-row-template");

    row.querySelector("[data-task-icon]").innerHTML = I.wrench(13);
    row.querySelector("[data-task-name]").textContent = task.name;
    row.querySelector("[data-clock-icon]").innerHTML = I.clock(12);
    row.querySelector("[data-task-duration]").textContent = task.durationMin + " min";
    row.querySelector("[data-task-labor]").textContent = "$" + task.laborCost.toFixed(2);
    row.querySelector("[data-task-parts]").textContent = task.parts.map((p) => p.qty + "x " + p.name).join(", ");
    row.querySelector("[data-task-total]").textContent = "$" + (task.laborCost + partTotal).toFixed(2);

    const edit = row.querySelector("[data-edit]");
    const del = row.querySelector("[data-del]");
    edit.dataset.edit = task.id;
    del.dataset.del = task.id;
    edit.innerHTML = I.pencil(13);
    del.innerHTML = I.trash(13);
    return row;
  }

  // Connects search/edit/delete buttons after the table DOM is recreated.
  function bindEvents(body) {
    const page = window.RepairTasksPage;
    const state = page.state;

    body.querySelector("#rt-q").addEventListener("input", (e) => {
      state.q = e.target.value;
      render();
      document.getElementById("rt-q").focus();
    });

    body.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        window.RepairTaskForms.openTaskForm(state.list.find((task) => task.id === btn.dataset.edit));
      });
    });

    body.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", () => deleteTask(btn.dataset.del));
    });
  }

  // Deletes a repair task through the backend, then reloads the catalog.
  function deleteTask(taskId) {
    confirmDialog({
      title: "Delete this repair task?",
      description: "The task will be removed from the catalog. Existing work orders that reference it remain unchanged.",
      confirmLabel: "Delete task",
      onConfirm: () => {
        window.API.repairTasks
          .remove(taskId)
          .then(() => {
            toast("Repair task deleted");
            window.RepairTasksPage.loadTasks();
          })
          .catch((err) => {
            console.error(err);
            toast("Could not delete repair task");
          });
      },
    });
  }

  window.RepairTaskRender = {
    render,
  };
})();
