(function () {
  // Validates employee create/update fields before API calls.
  function validateEmployee({ firstName, lastName, email, password }, isEdit) {
    const errs = {};
    if (!firstName.trim()) errs.firstName = "Required";
    if (!lastName.trim()) errs.lastName = "Required";
    if (!/.+@.+\..+/.test(email)) errs.email = "Invalid email";
    if (!isEdit && password.length < 6) errs.password = "Min 6 characters";
    return errs;
  }

  // Clears old validation messages and displays current errors.
  function showErrors(root, errs) {
    root.querySelectorAll("[data-err]").forEach((el) => {
      el.classList.add("hidden");
      el.textContent = "";
    });

    Object.keys(errs).forEach((key) => {
      const el = root.querySelector(`[data-err="${key}"]`);
      if (!el) return;
      el.textContent = errs[key];
      el.classList.remove("hidden");
    });
  }

  window.TechnicianValidators = { validateEmployee, showErrors };
})();
