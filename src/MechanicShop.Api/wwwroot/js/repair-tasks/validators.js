(function () {
  const VALID_DURATIONS = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180];

  // Validates repair task modal fields before create/update.
  function validateRepairTask({ name, durationMin, laborCost, parts }) {
    const errs = {};
    if (!name) errs.name = "Required";
    if (!VALID_DURATIONS.includes(durationMin)) errs.duration = "Use 15-180 mins by 15";
    if (Number.isNaN(laborCost) || laborCost < 1) errs.labor = "Must be ≥ 1";
    if (!parts.length) errs.parts = "At least one part is required";

    parts.forEach((part, index) => {
      if (!part.name) errs.parts = `Part ${index + 1}: name required`;
      if (!part.qty || part.qty < 1 || part.qty > 10) errs.parts = `Part ${index + 1}: qty 1-10`;
      if (!part.price || part.price < 1) errs.parts = `Part ${index + 1}: cost must be ≥ 1`;
    });

    return errs;
  }

  // Clears old messages and shows current validation errors.
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

  window.RepairTaskValidators = {
    validateRepairTask,
    showErrors,
  };
})();
