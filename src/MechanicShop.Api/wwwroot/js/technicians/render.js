(function () {
  const I = window.ICONS;
  const { confirmDialog, toast, initials } = window.UI;
  const { cloneTemplate } = window.TechnicianDom;

  // Renders technician table and binds row actions.
  function render() {
    const page = window.TechniciansPage;
    const state = page.state;
    const body = page.body;
    const needle = state.q.trim().toLowerCase();
    const filtered = !needle
      ? state.list
      : state.list.filter((tech) => (tech.name + " " + tech.email + " " + tech.role).toLowerCase().includes(needle));
    const active = state.list.filter((tech) => tech.active).length;
    const inactive = state.list.filter((tech) => !tech.active).length;

    body.replaceChildren(cloneTemplate("technicians-page-template"));
    body.querySelector("[data-staff-count]").textContent = active + " active · " + inactive + " inactive";
    body.querySelector("[data-search-icon]").outerHTML = I.search(14);
    body.querySelector("#tc-q").value = state.q;

    renderRows(body, filtered);
    bindEvents(body);
  }

  // Renders table rows or empty state.
  function renderRows(body, filtered) {
    const tbody = body.querySelector("[data-technician-body]");
    if (filtered.length === 0) {
      tbody.replaceChildren(cloneTemplate("technician-empty-template"));
      return;
    }
    tbody.replaceChildren(...filtered.map(renderRow));
  }

  // Builds one technician table row.
  function renderRow(tech) {
    const row = cloneTemplate("technician-row-template");
    row.querySelector("[data-tech-initials]").textContent = initials(tech.name);
    row.querySelector("[data-tech-name]").textContent = tech.name;
    row.querySelector("[data-tech-email]").textContent = tech.email;
    row.querySelector("[data-tech-role]").textContent = tech.role;
    row.querySelector("[data-tech-status]").replaceChildren(
      cloneTemplate(tech.active ? "technician-status-active-template" : "technician-status-inactive-template"),
    );

    const toggle = row.querySelector("[data-toggle]");
    toggle.dataset.toggle = tech.id;
    toggle.classList.add(tech.active ? "active" : "inactive");
    toggle.innerHTML = I.power(12) + " " + (tech.active ? "Deactivate" : "Reactivate");

    const edit = row.querySelector("[data-edit]");
    const del = row.querySelector("[data-del]");
    edit.dataset.edit = tech.id;
    del.dataset.del = tech.id;
    edit.innerHTML = I.pencil(13);
    del.innerHTML = I.trash(13);
    return row;
  }

  // Binds search, activate/deactivate, edit, and remove buttons.
  function bindEvents(body) {
    const page = window.TechniciansPage;
    const state = page.state;

    body.querySelector("#tc-q").addEventListener("input", (e) => {
      state.q = e.target.value;
      render();
      document.getElementById("tc-q").focus();
    });

    body.querySelectorAll("[data-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => toggleEmployee(state.list.find((tech) => tech.id === btn.dataset.toggle)));
    });

    body.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => window.TechnicianForms.openTechForm(state.list.find((tech) => tech.id === btn.dataset.edit)));
    });

    body.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", () => removeEmployee(state.list.find((tech) => tech.id === btn.dataset.del)));
    });
  }

  // Calls backend deactivate/reactivate then reloads employees.
  function toggleEmployee(tech) {
    const wasDeactivation = tech.active;
    const request = wasDeactivation ? window.API.employees.deactivate(tech.id) : window.API.employees.reactivate(tech.id);
    request
      .then(() => {
        if (wasDeactivation && isCurrentSessionEmployee(tech)) {
          logoutDeactivatedSession();
          return;
        }

        window.TechniciansPage.loadEmployees();
      })
      .catch((err) => {
        console.error(err);
        toast(err.message || "Could not update employee status");
      });
  }

  // True when the employee row matches the browser's logged-in user session.
  function isCurrentSessionEmployee(tech) {
    const session = window.UI.getSession();
    if (!session) return false;

    return String(session.id || "").toLowerCase() === String(tech.id || "").toLowerCase()
      || String(session.email || "").toLowerCase() === String(tech.email || "").toLowerCase();
  }

  // Clears the local auth state after the current manager deactivates their own account.
  function logoutDeactivatedSession() {
    window.UI.signOut();
    toast("Your account was deactivated. Please sign in with an active manager account.");
    setTimeout(() => { window.UI.goTo("index.html"); }, 700);
  }

  // Uses backend deactivate as the safe remove behavior because API has no hard delete.
  function removeEmployee(tech) {
    confirmDialog({
      title: "Remove this technician?",
      description: "The technician will be deactivated. Their historical work orders will remain on record.",
      confirmLabel: "Remove technician",
      onConfirm: () => {
        window.API.employees
          .deactivate(tech.id)
          .then(() => {
            if (isCurrentSessionEmployee(tech)) {
              logoutDeactivatedSession();
              return;
            }

            toast("Technician deactivated");
            window.TechniciansPage.loadEmployees();
          })
          .catch((err) => {
            console.error(err);
            toast(err.message || "Could not remove technician");
          });
      },
    });
  }

  window.TechnicianRender = { render };
})();
