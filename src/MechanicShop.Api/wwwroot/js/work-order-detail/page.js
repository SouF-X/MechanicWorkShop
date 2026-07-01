(function () {
  const { renderShell } = window.UI;
  const { templateFragment } = window.WorkOrderDetailDom;
  const { loadDetail } = window.WorkOrderDetailData;

  // Starts work order detail page.
  function init() {
    const id = new URLSearchParams(location.search).get("id");
    const loadingBody = renderShell({ title: "Work order", group: "Workflow", crumb: "Loading" });
    loadingBody.textContent = "Loading work order...";

    loadDetail(id).then((detail) => {
      if (!detail) {
        const body = renderShell({ title: "Work order", group: "Workflow", crumb: "Not found" });
        window.WorkOrderDetailRender.renderNotFound(body);
        return;
      }

      const actions = templateFragment("work-order-detail-actions-template");
      if (detail.workOrder.state === "Completed" && !detail.invoice) {
        actions.querySelector("#issue-inv").classList.remove("hidden");
      }

      const body = renderShell({
        title: detail.workOrder.number,
        group: "Workflow",
        crumb: detail.workOrder.number,
        actions,
      });

      window.WorkOrderDetailRender.renderDetail(body, detail);
    });
  }

  init();
})();
