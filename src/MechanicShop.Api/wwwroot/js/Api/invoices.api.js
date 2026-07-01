(function () {
  const request = window.API.request;
  const requestBlob = window.API.requestBlob;

  window.API.invoices = {
    // Gets all invoices.
    list() {
      return request("/api/v1/invoices");
    },

    // Issues an invoice for a completed/target work order.
    issueForWorkOrder(workOrderId) {
      return request(`/api/v1/invoices/workorders/${workOrderId}`, {
        method: "POST",
      });
    },

    // Gets one invoice by id.
    getById(invoiceId) {
      return request(`/api/v1/invoices/${invoiceId}`);
    },

    // Downloads invoice PDF as a Blob.
    pdf(invoiceId) {
      return requestBlob(`/api/v1/invoices/${invoiceId}/pdf`);
    },

    // Marks invoice as paid.
    settle(invoiceId) {
      return request(`/api/v1/invoices/${invoiceId}/payments`, {
        method: "PUT",
      });
    },
  };
})();
