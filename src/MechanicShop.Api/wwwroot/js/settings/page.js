(function () {
  const { renderShell, toast } = window.UI;
  const { templateFragment } = window.SettingsDom;
  const I = window.ICONS;

  // Starts the Settings page and loads operating hours from backend.
  function init() {
    const body = renderShell({ title: "Settings", group: "Shop", crumb: "Settings" });
    body.replaceChildren(templateFragment("settings-page-template"));

    body.querySelector("[data-clock-icon]").innerHTML = I.clock(16);
    body.querySelector("[data-save-icon]").innerHTML = I.save(14);

    loadOperatingHours(body);
    bindForm(body);
  }

  // Reads opening/closing time from the backend settings endpoint.
  function loadOperatingHours(body) {
    window.API.settings
      .operatingHours()
      .then((settings) => {
        body.querySelector("#s-opening").value = settings.openingTime;
        body.querySelector("#s-closing").value = settings.closingTime;
      })
      .catch((err) => {
        console.error(err);
        toast("Could not load settings");
      });
  }

  // Handles save click. Backend currently exposes GET only for operating hours.
  function bindForm(body) {
    body.querySelector("#set-form").addEventListener("submit", (e) => {
      e.preventDefault();
      toast("Settings endpoint is read-only for now");
    });
  }

  init();
})();
