(function () {
  const request = window.API.request;

  function toQuery(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") query.set(key, value);
    });
    const text = query.toString();
    return text ? `?${text}` : "";
  }

  window.API.workOrders = {
    // Gets paginated work orders with optional filters.
    list(params = {}) {
      return request(`/api/v1/workorders${toQuery(params)}`);
    },

    // Gets one work order by id.
    getById(workOrderId) {
      return request(`/api/v1/workorders/${workOrderId}`);
    },

    // Creates a work order.
    create(data) {
      return request("/api/v1/workorders", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    // Changes scheduled time and bay/spot.
    relocate(workOrderId, data) {
      return request(`/api/v1/workorders/${workOrderId}/relocation`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    // Assigns labor/technician to a work order.
    assignLabor(workOrderId, data) {
      return request(`/api/v1/workorders/${workOrderId}/labor`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    // Updates work order state/status.
    updateState(workOrderId, data) {
      return request(`/api/v1/workorders/${workOrderId}/state`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    // Replaces repair tasks on the work order.
    updateRepairTasks(workOrderId, data) {
      return request(`/api/v1/workorders/${workOrderId}/repair-task`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    // Deletes a work order.
    remove(workOrderId) {
      return request(`/api/v1/workorders/${workOrderId}`, {
        method: "DELETE",
      });
    },

    // Gets daily schedule. Backend requires a timezone header.
    schedule(date, { laborId, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone } = {}) {
      return request(`/api/v1/workorders/schedule/${date}${toQuery({ laborId })}`, {
        headers: { "X-TimeZone": timeZone },
      });
    },
  };
})();
