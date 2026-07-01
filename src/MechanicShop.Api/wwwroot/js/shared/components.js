/* Shared UI components: modals, confirmation dialog, and toast notifications. */
(function () {
  window.UI = window.UI || {};

  // Generic modal builder used by forms across Customers, Tasks, Work Orders, etc.
  function openModal({ title, subtitle, size = "md", body, footer = null, onClose }) {
    const wrap = document.createElement("div");
    wrap.className = "modal-root";
    const modal = window.UI.templateFragment("modal-template");
    if (!modal) return { root: wrap, body: null, close: () => {} };

    const card = modal.querySelector("[data-modal-card]");
    card.classList.add(size);
    modal.querySelector("[data-modal-title]").textContent = title;
    const subtitleEl = modal.querySelector("[data-modal-subtitle]");
    if (subtitle) {
      subtitleEl.textContent = subtitle;
      subtitleEl.classList.remove("hidden");
    }
    window.UI.appendContent(modal.querySelector("[data-modal-body]"), body);
    if (footer) {
      const footerEl = modal.querySelector("[data-modal-footer]");
      window.UI.appendContent(footerEl, footer);
      footerEl.classList.remove("hidden");
    }
    window.UI.renderIconPlaceholders(modal);
    wrap.appendChild(modal);
    document.body.appendChild(wrap);
    document.body.style.overflow = "hidden";
    const close = () => { wrap.remove(); document.body.style.overflow = ""; onClose?.(); };
    wrap.querySelectorAll("[data-close]").forEach(el => el.addEventListener("click", close));
    const onKey = (e) => { if (e.key === "Escape") { close(); window.removeEventListener("keydown", onKey); } };
    window.addEventListener("keydown", onKey);
    return { root: wrap, body: wrap.querySelector("[data-modal-body]"), close };
  }

  // Confirmation modal for destructive actions.
  function confirmDialog({ title, description, confirmLabel = "Delete", onConfirm }) {
    const wrap = document.createElement("div");
    wrap.className = "modal-root";
    const dialog = window.UI.templateFragment("confirm-dialog-template");
    if (!dialog) return;
    dialog.querySelector("[data-confirm-title]").textContent = title;
    dialog.querySelector("[data-confirm-description]").textContent = description;
    dialog.querySelector("[data-confirm]").textContent = confirmLabel;
    window.UI.renderIconPlaceholders(dialog);
    wrap.appendChild(dialog);
    document.body.appendChild(wrap);
    document.body.style.overflow = "hidden";
    const close = () => { wrap.remove(); document.body.style.overflow = ""; };
    wrap.querySelectorAll("[data-close]").forEach(el => el.addEventListener("click", close));
    wrap.querySelector("[data-confirm]").addEventListener("click", () => { onConfirm?.(); close(); });
  }

  // Small temporary notification shown after saves/deletes/actions.
  function toast(msg, type) {
    const resolvedType = type || (/could not|failed|error|required|invalid|select at least/i.test(String(msg)) ? "error" : "success");
    const t = window.UI.cloneTemplate("toast-template") || document.createElement("div");
    t.classList.add("toast", "toast-" + resolvedType);

    const icon = t.querySelector("[data-ui-icon]");
    if (icon) icon.dataset.uiIcon = resolvedType === "error" ? "xCircle" : "check";

    const message = t.querySelector("[data-toast-message]");
    if (message) message.textContent = msg;
    else t.textContent = msg;
    window.UI.renderIconPlaceholders(t);

    const renderedIcon = t.querySelector("svg");
    if (renderedIcon) renderedIcon.style.color = resolvedType === "error" ? "var(--destructive)" : "var(--success)";

    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .3s"; }, 2200);
    setTimeout(() => t.remove(), 2600);
  }

  Object.assign(window.UI, {
    openModal,
    confirmDialog,
    toast,
  });
})();
