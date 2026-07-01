(function () {
  const { renderShell, toast } = window.UI;
  const { loadInvoiceRows, loadInvoiceDetail } = window.InvoiceData;

  const state = {
    q: "",
    openId: null,
  };

  const InvoicesPage = {
    state,
    body: null,
    rows: [],
    openInvoice,
    closeInvoice,
    mount,
  };

  window.InvoicesPage = InvoicesPage;

  // Starts invoices page using real backend invoice data.
  function init() {
    mount();
  }

  // Chooses list or detail shell based on current state.
  function mount() {
    if (state.openId) {
      InvoicesPage.body = renderShell({ title: "Invoice", group: "Records", crumb: "Invoice" });
      loadInvoiceDetail(state.openId)
        .then((detail) => {
          InvoicesPage.body = renderShell({ title: "Invoice", group: "Records", crumb: detail.invoice.number || "Invoice" });
          window.InvoiceRender.renderDetail(detail);
        })
        .catch((err) => {
          console.error(err);
          toast("Could not load invoice");
          closeInvoice();
        });
      return;
    }

    InvoicesPage.body = renderShell({ title: "Invoices", group: "Records", crumb: "Invoices" });
    loadInvoiceRows()
      .then((rows) => {
        InvoicesPage.rows = rows;
        window.InvoiceRender.renderList();
      })
      .catch((err) => {
        console.error(err);
        InvoicesPage.rows = [];
        window.InvoiceRender.renderList();
        toast("Could not load invoices");
      });
  }

  // Opens invoice detail by id.
  function openInvoice(invoiceId) {
    state.openId = invoiceId;
    mount();
  }

  // Returns to invoice board.
  function closeInvoice() {
    state.openId = null;
    mount();
  }

  init();
})();
