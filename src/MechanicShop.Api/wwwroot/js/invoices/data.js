(function () {
  const SHOP = { name: "North Bay Garage" };

  function mapInvoice(dto) {
    const paymentStatus = dto.paymentStatus || "Unpaid";
    const customer = dto.customer || {};
    const vehicle = dto.vehicle || {};

    return {
      invoice: {
        id: dto.invoiceId,
        number: dto.invoiceNumber,
        status: paymentStatus,
        issuedAt: dto.issuedAtUtc,
        discountAmount: Number(dto.discountAmount || 0),
        taxAmount: Number(dto.taxAmount || 0),
      },
      workOrder: {
        id: dto.workOrderId,
        number: dto.workOrderNumber || "Work order",
        state: "Completed",
        bay: "-",
      },
      customer: {
        name: customer.name || "Customer",
        email: customer.email || "-",
        phone: customer.phoneNumber || "-",
      },
      vehicle: {
        year: vehicle.year || "",
        make: vehicle.make || "",
        model: vehicle.model || "",
        plate: vehicle.licensePlate || "-",
      },
      lineItems: (dto.items || []).map((item) => ({
        description: item.description || "Service performed",
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
        lineTotal: Number(item.lineTotal || 0),
      })),
      totals: {
        subtotal: Number(dto.subtotal || 0),
        tax: Number(dto.taxAmount || 0),
        discount: Number(dto.discountAmount || 0),
        total: Number(dto.total || 0),
      },
      total: Number(dto.total || 0),
      shop: SHOP,
    };
  }

  function loadInvoiceRows() {
    return window.API.invoices.list().then((items) => items.map(mapInvoice));
  }

  function loadInvoiceDetail(invoiceId) {
    return window.API.invoices.getById(invoiceId).then(mapInvoice);
  }

  window.InvoiceData = { loadInvoiceRows, loadInvoiceDetail };
})();
