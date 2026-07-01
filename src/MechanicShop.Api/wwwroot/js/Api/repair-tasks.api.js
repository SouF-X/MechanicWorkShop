(function () {
  const request = window.API.request;

  window.API.repairTasks = {
    // Gets all repair tasks from the backend catalog.
    list() {
      return request("/api/v1/repair-tasks");
    },

    // Gets one repair task by id.
    getById(repairTaskId) {
      return request(`/api/v1/repair-tasks/${repairTaskId}`);
    },

    // Creates a repair task.
    create(data) {
      return request("/api/v1/repair-tasks", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    // Updates a repair task.
    update(repairTaskId, data) {
      return request(`/api/v1/repair-tasks/${repairTaskId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    // Deletes a repair task.
    remove(repairTaskId) {
      return request(`/api/v1/repair-tasks/${repairTaskId}`, {
        method: "DELETE",
      });
    },
  };
})();
