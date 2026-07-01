(function () {
  // Validates customer form fields before sending create/update to the backend.
  function validateCustomerFields({ name, phone, email }) {
    const errs = {};
    if (!name) errs.name = "Name is required";
    if (!email) errs.email = "Email is required";
    else if (!/.+@.+\..+/.test(email)) errs.email = "Invalid email";
    if (!phone) errs.phone = "Phone is required";
    else if (!/^\+?\d{7,15}$/.test(phone)) errs.phone = "Use 7-15 digits, optional +";
    return errs;
  }

  // Validates vehicle form fields before adding/editing a vehicle on a customer.
  function validateVehicleFields(vehicle) {
    const errs = {};
    if (!vehicle.make) errs.make = "Required";
    if (!vehicle.model) errs.model = "Required";
    if (!vehicle.year || vehicle.year < 1950 || vehicle.year > 2100) errs.year = "Invalid year";
    if (!vehicle.plate) errs.plate = "Required";
    return errs;
  }

  // Clears old validation messages and displays the current form errors.
  function showErrors(root, errs) {
    root.querySelectorAll("[data-err]").forEach((el) => {
      el.classList.add("hidden");
      el.textContent = "";
    });

    Object.keys(errs).forEach((key) => {
      const el = root.querySelector('[data-err="' + key + '"]');
      if (!el) return;
      el.textContent = errs[key];
      el.classList.remove("hidden");
    });
  }

  window.CustomerValidators = {
    validateCustomerFields,
    validateVehicleFields,
    showErrors,
  };
})();
