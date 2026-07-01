(function () {
  const request = window.API.request;

  window.API.dashboard = {
    // Gets dashboard work-order stats for today or a specific yyyy-mm-dd date.
    stats(date) {
      const query = date ? `?date=${encodeURIComponent(date)}` : "";
      return request(`/api/v1/dashboard/stats${query}`);
    },
  };
})();
