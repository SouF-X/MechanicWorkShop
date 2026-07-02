(function () {
  const { renderShell, toast } = window.UI;
  const { templateFragment } = window.WorkOrderDom;
  const { pageItems, mapWorkOrder } = window.WorkOrderMappers;
  const I = window.ICONS;

  const STATE_VALUES = { Scheduled: 0, InProgress: 1, Completed: 2, Cancelled: 3 };

  const state = {
    list: [],
    q: "",
    stateFilter: "All",
    page: 1,
    pageSize: 8,
    totalPages: 1,
    totalCount: 0,
  };

  const WorkOrdersPage = {
    state,
    body: null,
    loadWorkOrders,
    setStateFilter,
    changePage,
  };

  window.WorkOrdersPage = WorkOrdersPage;

  // Starts the Work Orders page and loads backend data.
  function init() {
    const actions = window.UI.isManager() ? templateFragment("work-order-actions-template") : null;
    WorkOrdersPage.body = renderShell({ title: "Work Orders", group: "Workflow", crumb: "Work Orders", actions });
    const newWorkOrder = document.getElementById("new-wo");
    if (newWorkOrder) {
      newWorkOrder.querySelector("[data-new-wo-icon]").outerHTML = I.plus(14);
      newWorkOrder.addEventListener("click", window.WorkOrderForms.openWoForm);
    }
    loadWorkOrders();
  }

  // Loads a paginated/filterable work order list from backend.
  function loadWorkOrders() {
    const params = {
      Page: state.page,
      PageSize: state.pageSize,
      SearchTerm: state.q,
      State: state.stateFilter === "All" ? undefined : STATE_VALUES[state.stateFilter],
    };

    window.API.workOrders
      .list(params)
      .then((result) => {
        state.list = pageItems(result).map(mapWorkOrder);
        state.totalPages = result.totalPages || 1;
        state.totalCount = result.totalCount || state.list.length;
        window.WorkOrderRender.render();
      })
      .catch((err) => {
        console.error(err);
        toast("Could not load work orders");
        window.WorkOrderRender.render();
      });
  }

  // Applies a state filter and reloads from page 1.
  function setStateFilter(value) {
    state.stateFilter = value;
    state.page = 1;
    loadWorkOrders();
  }

  // Moves pagination by delta and reloads.
  function changePage(delta) {
    state.page += delta;
    if (state.page < 1) state.page = 1;
    if (state.page > state.totalPages) state.page = state.totalPages;
    loadWorkOrders();
  }

  init();
})();
