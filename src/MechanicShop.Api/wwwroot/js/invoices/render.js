(function () {
  const I = window.ICONS;
  const { invoiceChip, initials, setIcon, toast } = window.UI;
  const { cloneTemplate } = window.InvoiceDom;

  // Renders invoice column board.
  function renderList() {
    const page = window.InvoicesPage;
    const body = page.body;
    const rows = page.rows;
    const query = page.state.q.trim().toLowerCase();
    const filtered = !query
      ? rows
      : rows.filter(({ invoice, workOrder, customer }) =>
          (invoice.number + " " + workOrder.number + " " + customer.name + " " + customer.email).toLowerCase().includes(query),
        );

    const groups = {
      Unpaid: filtered.filter((x) => x.invoice.status === "Unpaid"),
      Paid: filtered.filter((x) => x.invoice.status === "Paid"),
      Refunded: filtered.filter((x) => x.invoice.status === "Refunded"),
    };
    const totals = {
      Unpaid: rows.filter((x) => x.invoice.status === "Unpaid").reduce((a, b) => a + b.total, 0),
      Paid: rows.filter((x) => x.invoice.status === "Paid").reduce((a, b) => a + b.total, 0),
      Refunded: rows.filter((x) => x.invoice.status === "Refunded").reduce((a, b) => a + b.total, 0),
    };

    body.replaceChildren(document.getElementById("invoice-list-page-template").content.cloneNode(true));
    body.querySelector("[data-search-icon]").outerHTML = I.search(15);
    body.querySelector("#inv-q").value = page.state.q;
    body.querySelector("[data-invoice-columns]").replaceChildren(
      invoiceColumn("Unpaid", "Awaiting payment", "coin", "destructive", groups.Unpaid, totals.Unpaid),
      invoiceColumn("Paid", "Settled invoices", "check2", "success", groups.Paid, totals.Paid),
      invoiceColumn("Refunded", "Reversed transactions", "rotate", "muted", groups.Refunded, totals.Refunded),
    );

    body.querySelector("#inv-q").addEventListener("input", (e) => {
      page.state.q = e.target.value;
      renderList();
      document.getElementById("inv-q").focus();
    });
    body.querySelectorAll("[data-open]").forEach((btn) => btn.addEventListener("click", () => page.openInvoice(btn.dataset.open)));
  }

  // Builds one invoice status column.
  function invoiceColumn(title, subtitle, icon, tone, items, total) {
    const node = cloneTemplate("invoice-column-template");
    node.querySelector("[data-column-bar]").classList.add(tone);
    const iconNode = node.querySelector("[data-column-icon]");
    iconNode.classList.add(tone);
    iconNode.innerHTML = I[icon](16);
    node.querySelector("[data-column-title]").textContent = title;
    node.querySelector("[data-column-count]").textContent = items.length;
    node.querySelector("[data-column-subtitle]").textContent = subtitle;
    node.querySelector("[data-column-total]").textContent = "$" + total.toFixed(2);
    const list = node.querySelector("[data-column-list]");
    list.replaceChildren(...(items.length ? items.map(invoiceCard) : [cloneTemplate("invoice-empty-card-template")]));
    return node;
  }

  // Builds one invoice card.
  function invoiceCard({ invoice, workOrder, customer, vehicle, total }) {
    const node = cloneTemplate("invoice-card-template");
    const btn = node.querySelector("[data-open]");
    btn.dataset.open = invoice.id;
    node.querySelector("[data-invoice-number]").textContent = invoice.number;
    node.querySelector("[data-workorder-number]").textContent = workOrder.number;
    node.querySelector("[data-customer-initials]").textContent = initials(customer.name);
    node.querySelector("[data-customer-name]").textContent = customer.name;
    node.querySelector("[data-vehicle-name]").textContent = vehicle.year + " " + vehicle.make + " " + vehicle.model;
    node.querySelector("[data-invoice-total]").textContent = "$" + total.toFixed(2);
    node.querySelector("[data-open-icon]").innerHTML = I.arrowUR(10);
    node.querySelector("[data-clock-icon]").innerHTML = I.clock(10);
    node.querySelector("[data-issued-date]").textContent = new Date(invoice.issuedAt).toLocaleDateString([], { dateStyle: "medium" });
    node.querySelector("[data-invoice-chip]").replaceChildren(invoiceChip(invoice.status));
    return node;
  }

  // Renders full invoice detail page.
  function renderDetail(detail) {
    const page = window.InvoicesPage;
    const body = page.body;
    const { invoice, workOrder, customer, vehicle, lineItems, totals, shop } = detail;
    const subtotal = totals.subtotal;
    const total = totals.total;
    const tax = totals.tax;
    const rows = buildLines(lineItems, subtotal);
    const issued = new Date(invoice.issuedAt);

    body.replaceChildren(cloneTemplate("invoice-detail-page-template"));
    body.querySelector("[data-back-icon]").innerHTML = I.arrowLeft(15);
    body.querySelector("[data-detail-workorder]").textContent = workOrder.number;
    body.querySelector("[data-print-icon]").innerHTML = I.printer(14);
    body.querySelector("[data-download-icon]").innerHTML = I.download(14);

    if (invoice.status === "Unpaid") renderPaidButton(body, invoice);
    renderWatermark(body, invoice.status);

    body.querySelector("[data-detail-number]").textContent = invoice.number;
    body.querySelector("[data-detail-issued]").textContent = "Issued · " + issued.toLocaleDateString([], { month: "short", day: "2-digit", year: "numeric" });
    body.querySelector("[data-detail-status]").replaceChildren(invoiceChip(invoice.status));
    body.querySelector("[data-shop-logo]").innerHTML = I.wrench(15);
    body.querySelector("[data-shop-name]").textContent = shop.name;
    body.querySelector("[data-billed-name]").textContent = customer.name;
    body.querySelector("[data-billed-contact]").textContent = customer.email + " · " + customer.phone;
    body.querySelector("[data-detail-vehicle]").textContent = vehicle.year + " " + vehicle.make + " " + vehicle.model;
    body.querySelector("[data-detail-plate]").textContent = vehicle.plate;
    body.querySelector("[data-meta-workorder]").textContent = workOrder.number;
    body.querySelector("[data-meta-state]").textContent = workOrder.state;
    body.querySelector("[data-pin-icon]").innerHTML = I.pin(10, "text-warning");
    body.querySelector("[data-meta-bay]").textContent = workOrder.bay;
    body.querySelector("[data-note-shop]").textContent = shop.name;

    body.querySelector("[data-line-items]").replaceChildren(...rows.map(renderLine));
    renderTotals(body, invoice, subtotal, tax, total);

    document.getElementById("inv-back").addEventListener("click", page.closeInvoice);
    document.getElementById("print-invoice").addEventListener("click", () => window.print());
    document.getElementById("download-invoice")?.addEventListener("click", () => {
      window.API.invoices
        .pdf(invoice.id)
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${invoice.number}.pdf`;
          link.click();
          URL.revokeObjectURL(url);
        })
        .catch(() => toast("Could not download invoice PDF"));
    });
  }

  // Builds clean invoice lines from repair tasks.
  function buildLines(lineItems, subtotal) {
    const rows = lineItems.map((item) => ({
      desc: cleanLineDescription(item.description),
      qty: item.quantity,
      unit: item.unitPrice,
    }));
    if (rows.length === 0) rows.push({ desc: "Service performed", qty: 1, unit: subtotal });
    return rows;
  }

  // Existing invoices may contain labor/parts details in the description.
  // Keep the invoice table clean by showing only the repair task name.
  function cleanLineDescription(description) {
    const firstLine = String(description || "").split(/\r?\n/)[0].trim();
    return firstLine
      .replace(/^\d+\s*:\s*/, "")
      .replace(/\s+Labor\s*=\s*.*$/i, "")
      .replace(/\s+Parts\s*:\s*.*$/i, "")
      .trim() || "Service performed";
  }

  // Builds one invoice detail line item row.
  function renderLine(line, index) {
    const row = cloneTemplate("invoice-line-template");
    row.querySelector("[data-line-number]").textContent = String(index + 1).padStart(2, "0");
    row.querySelector("[data-line-desc]").textContent = line.desc;
    row.querySelector("[data-line-qty]").textContent = line.qty;
    row.querySelector("[data-line-unit]").textContent = "$" + line.unit.toFixed(2);
    row.querySelector("[data-line-total]").textContent = "$" + (line.qty * line.unit).toFixed(2);
    return row;
  }

  // Adds mark paid button for unpaid invoices.
  function renderPaidButton(body, invoice) {
    const paid = document.createElement("button");
    paid.className = "btn btn-success";
    const paidIcon = document.createElement("span");
    setIcon(paidIcon, "check2", 14);
    paid.append(paidIcon, " Mark paid");
    paid.addEventListener("click", () => {
      window.API.invoices
        .settle(invoice.id)
        .then(() => {
          toast("Invoice marked paid");
          window.InvoicesPage.openInvoice(invoice.id);
        })
        .catch(() => toast("Could not mark invoice as paid"));
    });
    body.querySelector("[data-paid-action]").replaceChildren(paid);
  }

  // Displays paid/refunded watermark when needed.
  function renderWatermark(body, status) {
    const watermark = body.querySelector("[data-watermark]");
    if (status === "Paid" || status === "Refunded") {
      watermark.classList.add(status.toLowerCase());
      watermark.textContent = status.toUpperCase();
    } else {
      watermark.remove();
    }
  }

  // Renders subtotal/tax/final total rows.
  function renderTotals(body, invoice, subtotal, tax, total) {
    const discount = invoice.discountAmount || 0;
    const lines = [totalLine("Subtotal", "$" + subtotal.toFixed(2))];
    if (discount > 0) lines.push(totalLine("Discount", "- $" + discount.toFixed(2), "var(--accent)"));
    lines.push(totalLine("Tax", "$" + tax.toFixed(2)));
    const final = cloneTemplate("invoice-total-final-template");
    final.querySelector("[data-total-label]").textContent = "Total " + (invoice.status === "Paid" ? "paid" : "due");
    final.querySelector("[data-total-value]").textContent = "$" + total.toFixed(2);
    body.querySelector("[data-total-lines]").replaceChildren(...lines, final);
  }

  // Creates one label/value total row.
  function totalLine(label, value, color) {
    const row = document.createElement("div");
    row.className = "row-line";
    const l = document.createElement("span");
    l.className = "lbl";
    l.textContent = label;
    const v = document.createElement("span");
    v.className = "v";
    v.textContent = value;
    if (color) v.style.color = color;
    row.replaceChildren(l, v);
    return row;
  }

  window.InvoiceRender = { renderList, renderDetail };
})();
