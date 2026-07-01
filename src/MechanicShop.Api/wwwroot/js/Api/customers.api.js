(function () {
  const request = window.API.request;

  window.API.customers = {
    list() {
      return request("/api/v1/customers");
    },

    getById(customerId) {
      return request(`/api/v1/customers/${customerId}`);
    },

    create(data) {
      return request("/api/v1/customers", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    update(customerId, data) {
      return request(`/api/v1/customers/${customerId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    remove(customerId) {
      return request(`/api/v1/customers/${customerId}`, {
        method: "DELETE",
      });
    },
  };
})();
