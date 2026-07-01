(function () {
  const I = window.ICONS;
  const { openModal, toast, initials } = window.UI;
  const { cloneTemplate, templateFragment } = window.TechnicianDom;
  const { toEmployeePayload } = window.TechnicianMappers;
  const { validateEmployee, showErrors } = window.TechnicianValidators;

  // Opens create/edit employee modal.
  function openTechForm(tech) {
    const isEdit = !!tech;
    const formState = {
      firstName: tech?.firstName || "",
      lastName: tech?.lastName || "",
      roleValue: tech?.roleValue ?? 0,
    };

    const modal = openModal({
      title: isEdit ? "Edit employee" : "New employee",
      subtitle: isEdit ? "Update profile" : "Add a Labor or Manager to your team",
      size: "lg",
      body: templateFragment("technician-modal-body-template"),
      footer: templateFragment("technician-modal-footer-template"),
    });

    fillForm(modal.root, tech, formState, isEdit);
    bindPreview(modal.root, formState);
    modal.root.querySelector("[data-cancel]").addEventListener("click", modal.close);
    modal.root.querySelector("[data-save]").addEventListener("click", () => saveEmployee(modal, tech, formState, isEdit));
  }

  // Sets initial form values, password field, icons, and role selection.
  function fillForm(root, tech, formState, isEdit) {
    if (!isEdit) {
      root.querySelector("[data-tech-form-fields]").appendChild(cloneTemplate("technician-password-field-template"));
    }

    root.querySelector("#t-first").value = formState.firstName;
    root.querySelector("#t-last").value = formState.lastName;
    root.querySelector("#t-email").value = tech?.email || "";
    root.querySelector("[data-first-icon]").outerHTML = I.user(14);
    root.querySelector("[data-email-icon]").outerHTML = I.mail(14);
    root.querySelector("[data-role-labor-icon]").outerHTML = I.shield(13);
    root.querySelector("[data-role-manager-icon]").outerHTML = I.shield(13);
    if (!isEdit) {
      root.querySelector("[data-password-icon]").outerHTML = I.lock(14);
      bindPasswordToggle(root);
    }
    root.querySelector("[data-prev-role-icon]").outerHTML = I.shield(11);
    root.querySelector("[data-save]").textContent = isEdit ? "Save changes" : "Create employee";
    updatePreview(root, formState);
    root.querySelectorAll("[data-role]").forEach((btn) => btn.classList.toggle("selected", Number(btn.dataset.role) === formState.roleValue));
  }

  // Shows/hides the password field.
  function bindPasswordToggle(root) {
    const input = root.querySelector("#t-pwd");
    const toggle = root.querySelector("[data-password-toggle]");
    const icon = root.querySelector("[data-password-toggle-icon]");
    if (!input || !toggle || !icon) return;

    icon.innerHTML = I.eye(16);

    toggle.addEventListener("click", () => {
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      toggle.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
      icon.innerHTML = isHidden ? I.eyeOff(16) : I.eye(16);
    });
  }

  // Keeps preview card synced with form fields.
  function bindPreview(root, formState) {
    root.querySelector("#t-first").addEventListener("input", (e) => {
      formState.firstName = e.target.value;
      updatePreview(root, formState);
    });
    root.querySelector("#t-last").addEventListener("input", (e) => {
      formState.lastName = e.target.value;
      updatePreview(root, formState);
    });
    root.querySelectorAll("[data-role]").forEach((btn) => {
      btn.addEventListener("click", () => {
        formState.roleValue = Number(btn.dataset.role);
        root.querySelectorAll("[data-role]").forEach((x) => x.classList.toggle("selected", Number(x.dataset.role) === formState.roleValue));
        updatePreview(root, formState);
      });
    });
  }

  // Updates modal preview name, initials, and role badge.
  function updatePreview(root, formState) {
    const name = `${formState.firstName} ${formState.lastName}`.trim() || "New employee";
    root.querySelector("#prev-name").textContent = name;
    root.querySelector("#prev-init").textContent = initials(name);
    root.querySelector("[data-prev-role-label]").textContent = formState.roleValue === 1 ? "Manager" : "Labor";
  }

  // Validates and sends create/update employee request to backend.
  function saveEmployee(modal, tech, formState, isEdit) {
    const employee = {
      firstName: formState.firstName.trim(),
      lastName: formState.lastName.trim(),
      email: modal.root.querySelector("#t-email").value.trim(),
      roleValue: formState.roleValue,
      password: isEdit ? "" : modal.root.querySelector("#t-pwd").value,
    };

    const errs = validateEmployee(employee, isEdit);
    showErrors(modal.root, errs);
    if (Object.keys(errs).length) return;

    const request = isEdit
      ? window.API.employees.update(tech.id, toEmployeePayload(employee))
      : window.API.employees.create(toEmployeePayload(employee));

    request
      .then(() => {
        modal.close();
        toast(isEdit ? "Technician updated" : "Technician added");
        window.TechniciansPage.loadEmployees();
      })
      .catch((err) => {
        console.error(err);
        toast(err.message || (isEdit ? "Could not update technician" : "Could not add technician"));
      });
  }

  window.TechnicianForms = { openTechForm };
})();
