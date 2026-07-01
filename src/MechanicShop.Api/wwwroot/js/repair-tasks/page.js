(function () {
  const { renderShell, toast } = window.UI;
  const { templateFragment } = window.RepairTaskDom;
  const { mapRepairTask } = window.RepairTaskMappers;
  const I = window.ICONS;

  const state = {
    list: [],
    q: "",
  };

  const RepairTasksPage = {
    state,
    body: null,
    loadTasks,
  };

  window.RepairTasksPage = RepairTasksPage;

  // Starts the Repair Tasks page: shell, actions, and initial API load.
  function init() {
    const actions = templateFragment("repair-task-actions-template");
    RepairTasksPage.body = renderShell({
      title: "Repair Tasks",
      group: "Records",
      crumb: "Repair Tasks",
      actions,
    });

    const newTask = document.getElementById("new-task");
    newTask.querySelector("[data-new-task-icon]").outerHTML = I.plus(14);
    newTask.addEventListener("click", () => window.RepairTaskForms.openTaskForm());

    loadTasks();
  }

  // Loads repair tasks from backend and refreshes the table.
  function loadTasks() {
    window.API.repairTasks
      .list()
      .then((data) => {
        state.list = data.map(mapRepairTask);
        window.RepairTaskRender.render();
      })
      .catch((err) => {
        console.error(err);
        toast("Could not load repair tasks");
        window.RepairTaskRender.render();
      });
  }

  init();
})();
