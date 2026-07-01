(function () {
  const request = window.API.request;

  window.API.settings = {
    // Gets backend configured opening/closing hours.
    operatingHours() {
      return request("/api/settings/operating-hours");
    },
  };
})();
