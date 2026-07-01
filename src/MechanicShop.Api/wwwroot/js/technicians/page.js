(function () {
  const { renderShell, toast } = window.UI;
  const { templateFragment } = window.TechnicianDom;
  const { mapEmployee } = window.TechnicianMappers;
  const I = window.ICONS;

  const state = {
    list: [],
    q: "",
  };

  const TechniciansPage = {
    state,
    body: null,
    loadEmployees,
  };

  window.TechniciansPage = TechniciansPage;

  // Starts the Technicians page: shell, action button, initial backend load.
  function init() {
    const actions = templateFragment("technician-actions-template");
    TechniciansPage.body = renderShell({
      title: "Technicians",
      group: "Shop",
      crumb: "Technicians",
      actions,
    });

    const newTech = document.getElementById("new-tech");
    newTech.querySelector("[data-new-tech-icon]").outerHTML = I.plus(14);
    newTech.addEventListener("click", () => window.TechnicianForms.openTechForm());

    loadEmployees();
  }

  // Loads employees from backend and renders the staff table.
  function loadEmployees() {
    window.API.employees
      .list()
      .then((data) => {
        state.list = data.map(mapEmployee);
        window.TechnicianRender.render();
      })
      .catch((err) => {
        console.error(err);
        toast("Could not load technicians");
        window.TechnicianRender.render();
      });
  }

  init();
})();
