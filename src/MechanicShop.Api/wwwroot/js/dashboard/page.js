(function () {
  const { renderShell } = window.UI;
  const { templateFragment } = window.DashboardDom;
  const { emptyDashboardData, emptyStats, mapBackendStats, loadDashboardData } = window.DashboardData;

  // Starts dashboard shell, renders layout, then loads real backend KPI stats.
  function init() {
    const actions = templateFragment("dashboard-actions-template");
    const body = renderShell({ title: "Manager Command Center", group: "Workflow", crumb: "Dashboard", actions });
    if (!body) return;

    const data = emptyDashboardData();

    DashboardRender.mount(body);
    DashboardRender.renderAll(body, data, emptyStats());

    Promise.all([
      window.API.dashboard.stats().then(mapBackendStats),
      loadDashboardData(),
    ])
      .then(([stats, liveData]) => {
        DashboardRender.renderAll(body, liveData, {
          ...stats,
          unpaidTotal: liveData.unpaidTotal,
        });
      })
      .catch((err) => {
        console.error(err);
        window.UI.toast("Could not load dashboard data", "error");
      });
  }

  init();
})();
