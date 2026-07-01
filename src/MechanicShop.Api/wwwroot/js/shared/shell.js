/* Shared app shell/sidebar renderer. */
(function () {
  window.UI = window.UI || {};

  const NAV = [
    { to: "dashboard.html",       label: "Dashboard",    icon: "dashboard",  group: "Workflow", match: /dashboard/ },
    { to: "schedule.html",        label: "Schedule",     icon: "calendar",   group: "Workflow", match: /schedule/ },
    { to: "work-orders.html",     label: "Work Orders",  icon: "clipboard",  group: "Workflow", match: /work-order/ },
    { to: "customers.html",       label: "Customers",    icon: "users",      group: "Records",  match: /customers/ },
    { to: "repair-tasks.html",    label: "Repair Tasks", icon: "wrench",     group: "Records",  match: /repair-tasks/ },
    { to: "invoices.html",        label: "Invoices",     icon: "receipt",    group: "Records",  match: /invoices/ },
    { to: "technicians.html",     label: "Technicians",  icon: "hardhat",    group: "Shop",     match: /technicians/ },
    { to: "settings.html",        label: "Settings",     icon: "settings",   group: "Shop",     match: /settings/ },
  ];

  // Builds the logged-in app layout: sidebar, top bar, page action area, body host.
  function renderShell({ title, group, crumb, actions = null }) {
    const session = window.UI.getSession();
    if (!session) { location.href = "../index.html"; return; }

    const root = document.querySelector("[data-shell]");
    const template = window.UI.getTemplate("app-shell-template");
    if (!root || !template) return;

    const shell = template.content.cloneNode(true);
    const collapsed = localStorage.getItem("mech.sidebar.collapsed") === "1";
    const sidebar = shell.querySelector("[data-sidebar]");
    sidebar.classList.toggle("collapsed", collapsed);

    shell.querySelectorAll("[data-session-initials]").forEach(el => { el.textContent = session.initials; });
    shell.querySelectorAll("[data-session-name]").forEach(el => { el.textContent = session.name; });
    shell.querySelectorAll("[data-session-role]").forEach(el => { el.textContent = window.UI.normalizeRole(session.role); });
    shell.querySelectorAll("[data-shell-group]").forEach(el => { el.textContent = group || ""; });
    shell.querySelector("[data-shell-crumb]").textContent = crumb || title;
    shell.querySelector("[data-shell-title]").textContent = title;
    shell.querySelector("[data-today]").textContent = new Date().toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

    const toggle = shell.querySelector("[data-sidebar-toggle]");
    toggle.title = collapsed ? "Expand sidebar" : "Collapse sidebar";
    toggle.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
    window.UI.setIcon(toggle, collapsed ? "panelOpen" : "panelClose", 15);

    const path = location.pathname;
    shell.querySelectorAll("[data-nav-link]").forEach(link => {
      const key = link.dataset.navLink;
      const active = key === "work-order" ? /work-order/.test(path) : path.includes(key);
      link.classList.toggle("active", active);
      link.querySelector("[data-active-marker]")?.classList.toggle("hidden", !(active && !collapsed));
    });

    const actionHost = shell.querySelector("[data-page-actions]");
    window.UI.appendContent(actionHost, actions);
    window.UI.renderIconPlaceholders(shell);
    root.replaceChildren(shell);
    window.UI.refreshSessionFromBackend();

    // Wire up interactions
    document.querySelector("[data-signout]").addEventListener("click", () => { window.UI.signOut(); location.href = "../index.html"; });
    const liveSidebar = document.querySelector("[data-sidebar]");
    const backdrop = document.querySelector("[data-sidebar-backdrop]");
    const closeSidebar = () => { liveSidebar.classList.remove("open"); backdrop.classList.add("hidden"); };
    document.querySelector("[data-sidebar-open]")?.addEventListener("click", () => {
      liveSidebar.classList.add("open");
      backdrop.classList.remove("hidden");
    });
    document.querySelector("[data-sidebar-close]")?.addEventListener("click", closeSidebar);
    document.querySelector("[data-sidebar-toggle]").addEventListener("click", () => {
      liveSidebar.classList.toggle("collapsed");
      localStorage.setItem("mech.sidebar.collapsed", liveSidebar.classList.contains("collapsed") ? "1" : "0");
    });
    backdrop?.addEventListener("click", closeSidebar);

    // Quick Create dropdown
    const qcWrap = document.querySelector("[data-qc]");
    const qcMenu = qcWrap.querySelector("[data-qc-menu]");
    qcWrap.querySelector("[data-qc-toggle]").addEventListener("click", (e) => {
      e.stopPropagation(); qcMenu.classList.toggle("hidden");
    });
    document.addEventListener("click", (e) => {
      if (!qcWrap.contains(e.target)) qcMenu.classList.add("hidden");
    });

    return document.querySelector("[data-page-body]");
  }

  Object.assign(window.UI, {
    renderShell,
    NAV,
  });
})();
