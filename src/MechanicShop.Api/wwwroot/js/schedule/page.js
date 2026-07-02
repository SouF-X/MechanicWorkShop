(function () {
  const { renderShell, toast } = window.UI;
  const { toDateKey, mapSchedule, mapScheduleFromWorkOrders } = window.ScheduleMappers;

  const state = {
    date: new Date(),
    techFilter: "all",
    employees: [],
    board: { bays: ["Bay 1", "Bay 2", "Bay 3", "Bay 4"], slots: [], jobs: [] },
  };

  const SchedulePage = {
    state,
    body: null,
    mountShell,
    changeDay,
    today,
    setDate,
    setTechFilter,
    loadSchedule,
  };

  window.SchedulePage = SchedulePage;

  // Starts page by loading employees and the selected day schedule.
  function init() {
    if (window.UI.isManager()) {
      loadEmployees().finally(loadSchedule);
      return;
    }

    state.employees = [];
    state.techFilter = "all";
    loadSchedule();
  }

  // Re-renders shell actions while keeping the same page body reference.
  function mountShell(actions) {
    SchedulePage.body = renderShell({ title: "Schedule", group: "Workflow", crumb: "Schedule board", actions });
  }

  // Loads active employees for the technician filter.
  function loadEmployees() {
    return window.API.employees
      .list()
      .then((data) => {
        state.employees = data.map((employee) => ({
          id: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`.trim(),
          active: employee.isActive,
        }));
      })
      .catch((err) => {
        console.error(err);
        state.employees = [];
      });
  }

  // Loads the schedule board from backend for selected date.
  function loadSchedule() {
    const laborId = state.techFilter === "all" ? undefined : state.techFilter;
    return window.API.workOrders
      .schedule(toDateKey(state.date), { laborId })
      .then((data) => {
        state.board = mapSchedule(data);
        if (state.board.jobs.length === 0) {
          return loadScheduleFallback();
        }
        window.ScheduleRender.render();
      })
      .catch((err) => {
        console.error(err);
        return loadScheduleFallback(err.message);
      });
  }

  // Fallback through the Work Orders list endpoint so the board still shows jobs
  // if the detailed schedule endpoint returns no occupied slots or fails.
  function loadScheduleFallback(originalError) {
    const start = new Date(state.date.getFullYear(), state.date.getMonth(), state.date.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return window.API.workOrders
      .list({
        Page: 1,
        PageSize: 100,
        LaborId: state.techFilter === "all" ? undefined : state.techFilter,
        StartDateFrom: start.toISOString(),
        StartDateTo: end.toISOString(),
      })
      .then((result) => {
        state.board = mapScheduleFromWorkOrders(result);
        window.ScheduleRender.render();
      })
      .catch((err) => {
        console.error(err);
        toast(originalError || err.message || "Could not load schedule");
        window.ScheduleRender.render();
      });
  }

  // Moves selected schedule date by a number of days.
  function changeDay(offset) {
    state.date.setDate(state.date.getDate() + offset);
    loadSchedule();
  }

  // Resets schedule date to today.
  function today() {
    state.date = new Date();
    loadSchedule();
  }

  // Jumps schedule to a selected calendar date.
  function setDate(value) {
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return;

    state.date = new Date(year, month - 1, day);
    loadSchedule();
  }

  // Updates technician filter and reloads schedule.
  function setTechFilter(value) {
    state.techFilter = value;
    loadSchedule();
  }

  init();
})();
