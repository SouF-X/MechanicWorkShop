/* Shared formatting and badge helpers. */
(function () {
  window.UI = window.UI || {};

  const fmtMoney = (n) => "$" + Number(n || 0).toFixed(2);
  const fmtMoney0 = (n) => "$" + Math.round(Number(n || 0));
  const initials = (name) => (name || "??").split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase();
  const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  // Standard visual badge for work order states.
  function stateChip(state) {
    const chip = window.UI.cloneTemplate("state-chip-template") || document.createElement("span");
    const cls = state === "InProgress" ? "inprogress" : state.toLowerCase();
    const label = state === "InProgress" ? "In Progress" : state;
    chip.classList.add("chip", cls);
    const text = chip.querySelector("[data-chip-label]");
    if (text) text.textContent = label;
    else chip.textContent = label;
    return chip;
  }

  // Standard visual badge for invoice statuses.
  function invoiceChip(status) {
    const chip = window.UI.cloneTemplate("invoice-chip-template") || document.createElement("span");
    chip.classList.add("chip", status.toLowerCase());
    const text = chip.querySelector("[data-chip-label]");
    if (text) text.textContent = status;
    else chip.textContent = status;
    return chip;
  }

  Object.assign(window.UI, {
    fmtMoney,
    fmtMoney0,
    initials,
    escapeHtml,
    stateChip,
    invoiceChip,
  });
})();
