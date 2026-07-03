/* Shared template helpers: loads and clones HTML templates used by the app shell/UI. */
(function () {
  window.UI = window.UI || {};

  let sharedTemplatesLoaded = false;

  function detectAppRoot() {
    const scripts = Array.from(document.scripts || []);
    const src = scripts
      .map(script => script.getAttribute("src") ? new URL(script.getAttribute("src"), location.href).pathname : "")
      .find(path => /\/js\/shared\/templates\.js$/i.test(path));

    if (!src) return "";
    const root = src.replace(/\/js\/shared\/templates\.js$/i, "").replace(/\/+$/, "");
    return root === "/" ? "" : root;
  }

  const appRoot = detectAppRoot();
  const rooted = (path) => `${appRoot}/${path.replace(/^\//, "")}`;

  // Loads shared HTML templates once so every page can reuse the same shell/icons.
  function ensureSharedTemplates() {
    if (document.getElementById("app-shell-template")) {
      sharedTemplatesLoaded = true;
      return true;
    }
    if (sharedTemplatesLoaded) return false;

    const partialPaths = location.pathname.includes("/html/")
      ? ["partials/shared-templates.html", "./partials/shared-templates.html", rooted("html/partials/shared-templates.html")]
      : ["html/partials/shared-templates.html", "./html/partials/shared-templates.html", rooted("html/partials/shared-templates.html")];

    for (const partialPath of partialPaths) {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", partialPath, false);
        xhr.send(null);

        const loaded = ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 0)
          && xhr.responseText.includes("app-shell-template")
          && xhr.responseText.includes("icon-dashboard");

        if (loaded) {
          document.body.insertAdjacentHTML("afterbegin", xhr.responseText);
          sharedTemplatesLoaded = true;
          return true;
        }
      } catch {}
    }

    console.error("Could not load shared templates. Run the project with `npm run dev` so html/partials/shared-templates.html can be loaded.");
    sharedTemplatesLoaded = true;
    return false;
  }

  function getTemplate(id) {
    let template = document.getElementById(id);
    if (!template) {
      ensureSharedTemplates();
      template = document.getElementById(id);
    }
    return template;
  }

  function cloneTemplate(id) {
    return getTemplate(id)?.content.firstElementChild.cloneNode(true) || null;
  }

  function templateFragment(id) {
    return getTemplate(id)?.content.cloneNode(true) || null;
  }

  function appendContent(target, content) {
    if (!target || content == null) return;
    if (content instanceof DocumentFragment || content instanceof HTMLElement) {
      target.appendChild(content);
      return;
    }
    target.textContent = String(content);
  }

  ensureSharedTemplates();

  Object.assign(window.UI, {
    ensureSharedTemplates,
    getTemplate,
    cloneTemplate,
    templateFragment,
    appendContent,
  });
})();
