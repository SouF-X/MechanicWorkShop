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

  window.API.employees = {
    // Gets employees, optionally filtered by role/isActive.
    list(filters = {}) {
      return request(`/api/v1/employees${toQuery(filters)}`);
    },

    // Gets one employee by id.
    getById(employeeId) {
      return request(`/api/v1/employees/${employeeId}`);
    },

    // Creates an employee account.
    create(data) {
      return request("/api/v1/employees", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    // Updates employee account details.
    update(employeeId, data) {
      return request(`/api/v1/employees/${employeeId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    // Marks an employee inactive.
    deactivate(employeeId) {
      return request(`/api/v1/employees/${employeeId}/deactivate`, {
        method: "PATCH",
      });
    },

    // Marks an employee active again.
    reactivate(employeeId) {
      return request(`/api/v1/employees/${employeeId}/reactivate`, {
        method: "PATCH",
      });
    },
  };
})();
