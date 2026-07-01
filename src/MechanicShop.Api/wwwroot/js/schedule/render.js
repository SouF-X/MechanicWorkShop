(function () {
  const I = window.ICONS;
  const { stateChip } = window.UI;
  const { cloneTemplate, templateFragment } = window.ScheduleDom;

  // Renders the whole schedule board for current state.
  function render() {
    const page = window.SchedulePage;
    const state = page.state;
    const dateLabel = state.date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

    const actions = templateFragment("schedule-actions-template");
    actions.querySelector("[data-date-label]").textContent = dateLabel;
    actions.querySelector("#schedule-date-picker").value = window.ScheduleMappers.toDateKey(state.date);
    page.mountShell(actions);

    const body = page.body;
    body.replaceChildren(document.getElementById("schedule-page-template").content.cloneNode(true));
    body.querySelector("[data-hours-title]").textContent = "Operating hours";
    body.querySelector("[data-job-count]").textContent = state.board.jobs.length + " job" + (state.board.jobs.length === 1 ? "" : "s") + " on board";
    body.querySelector("[data-filter-icon]").innerHTML = I.filter(14);

    renderFilter(body, state.employees, state.techFilter);
    renderGrid(body, state.board);
    body.querySelector("[data-legend-chips]").replaceChildren(stateChip("Scheduled"), stateChip("InProgress"), stateChip("Completed"), stateChip("Cancelled"));
    bindEvents();
  }

  // Fills technician filter options.
  function renderFilter(body, employees, selectedId) {
    const select = body.querySelector("#tech-filter");
    const all = document.createElement("option");
    all.value = "all";
    all.textContent = "All technicians";
    select.appendChild(all);

    employees.filter((e) => e.active).forEach((employee) => {
      const opt = document.createElement("option");
      opt.value = employee.id;
      opt.textContent = employee.name;
      opt.selected = employee.id === selectedId;
      select.appendChild(opt);
    });
    select.value = selectedId;
  }

  // Builds the schedule grid headers and job slots.
  function renderGrid(body, board) {
    const grid = body.querySelector("[data-schedule-grid]");
    grid.style.gridTemplateColumns = "90px repeat(" + board.bays.length + ", minmax(150px, 1fr))";

    appendCell(grid, "sched-cell", "Time");
    board.bays.forEach((bay) => appendCell(grid, "sched-cell bay", bay));

    board.slots.forEach((slot) => {
      appendCell(grid, "sched-time", slot);
      board.bays.forEach((bay) => {
        const job = board.jobs.find((item) => item.bay === bay && item.slot === slot);
        grid.appendChild(job ? jobNode(job) : emptySlot());
      });
    });
  }

  // Creates one text cell for grid headers/times.
  function appendCell(grid, className, text) {
    const cell = document.createElement("div");
    cell.className = className;
    cell.textContent = text;
    grid.appendChild(cell);
  }

  // Creates an empty schedule slot.
  function emptySlot() {
    const empty = document.createElement("div");
    empty.className = "sched-slot empty";
    return empty;
  }

  // Creates one occupied job slot from template.
  function jobNode(job) {
    const node = cloneTemplate("schedule-job-template");
    const link = node.querySelector("[data-job-link]");
    link.classList.add(job.state === "InProgress" ? "inprogress" : job.state.toLowerCase());
    link.href = "work-order-detail.html?id=" + job.id;
    node.querySelector("[data-job-customer]").textContent = job.customer;
    node.querySelector("[data-job-state]").replaceChildren(stateChip(job.state));
    node.querySelector("[data-job-vehicle]").textContent = job.vehicle;
    node.querySelector("[data-job-number]").textContent = job.number;
    return node;
  }

  // Binds day navigation and filter changes.
  function bindEvents() {
    document.getElementById("day-prev").addEventListener("click", () => window.SchedulePage.changeDay(-1));
    document.getElementById("day-next").addEventListener("click", () => window.SchedulePage.changeDay(1));
    document.getElementById("day-today").addEventListener("click", () => window.SchedulePage.today());

    const datePicker = document.getElementById("schedule-date-picker");
    document.querySelector(".calendar-jump")?.addEventListener("click", () => datePicker.showPicker?.());
    datePicker.addEventListener("change", (e) => window.SchedulePage.setDate(e.target.value));

    document.getElementById("tech-filter").addEventListener("change", (e) => window.SchedulePage.setTechFilter(e.target.value));
  }

  window.ScheduleRender = { render };
})();
