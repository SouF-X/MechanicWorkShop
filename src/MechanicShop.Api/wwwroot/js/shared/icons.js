/* Shared SVG icon library and icon rendering helpers. */
(function () {
  window.UI = window.UI || {};

  // The actual SVG markup lives in html/partials/shared-templates.html.
  const ICON_NAMES = [
    "dashboard", "calendar", "clipboard", "users", "wrench", "receipt", "hardhat", "settings",
    "bell", "logout", "menu", "x", "chevronR", "chevronL", "plus", "plusCb", "userPlus",
    "panelClose", "panelOpen", "loader", "check2", "xCircle", "dollar", "alert", "arrowUR",
    "activity", "fileText", "search", "filter", "trash", "pencil", "phone", "mail", "car",
    "user", "arrowLeft", "userCog", "move", "shield", "shieldChk", "check", "download",
    "printer", "rotate", "coin", "clock", "pin", "save", "building", "power", "lock", "eye", "eyeOff", "alertC", "arrowRt",
  ];

  function iconElement(name, size = 16, cls = "") {
    window.UI.ensureSharedTemplates?.();
    if (!document.getElementById("icon-" + name)) return null;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    if (cls) svg.setAttribute("class", cls);

    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#icon-" + name);
    use.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#icon-" + name);
    svg.appendChild(use);
    return svg;
  }

  function iconMarkup(name, size = 16, cls = "") {
    return iconElement(name, size, cls)?.outerHTML || "";
  }

  function renderIconPlaceholders(root = document) {
    root.querySelectorAll("[data-ui-icon]").forEach(el => {
      replaceWithIcon(el, el.dataset.uiIcon, Number(el.dataset.size || 16), el.dataset.class || "");
    });
  }

  function setIcon(el, name, size = 16, cls = "") {
    const svg = iconElement(name, size, cls);
    if (el && svg) el.replaceChildren(svg);
  }

  function replaceWithIcon(el, name, size = 16, cls = "") {
    const svg = iconElement(name, size, cls);
    if (el && svg) el.replaceWith(svg);
  }

  const ICONS = Object.fromEntries(
    ICON_NAMES.map(name => [name, (size = 16, cls = "") => iconMarkup(name, size, cls)])
  );

  window.ICONS = ICONS;
  Object.assign(window.UI, {
    renderIconPlaceholders,
    setIcon,
    replaceWithIcon,
    iconElement,
  });
})();
