/* Shared auth/session helpers backed by localStorage. */
(function () {
  window.UI = window.UI || {};

  const SESSION_KEY = "mech.session.v1";
  const APP_ROOT = detectAppRoot();

  function detectAppRoot() {
    const scripts = Array.from(document.scripts || []);
    const src = scripts
      .map(script => script.getAttribute("src") ? new URL(script.getAttribute("src"), location.href).pathname : "")
      .find(path => /\/js\/shared\/session\.js$/i.test(path));

    if (src) {
      return normalizeRoot(src.replace(/\/js\/shared\/session\.js$/i, ""));
    }

    const path = location.pathname;
    const htmlIndex = path.toLowerCase().indexOf("/html/");
    if (htmlIndex >= 0) return normalizeRoot(path.slice(0, htmlIndex));
    if (/\/index\.html$/i.test(path)) return normalizeRoot(path.replace(/\/index\.html$/i, ""));
    return normalizeRoot(path.endsWith("/") ? path.slice(0, -1) : "");
  }

  function normalizeRoot(root) {
    if (!root || root === "/") return "";
    return root.replace(/\/+$/, "");
  }

  function toAppUrl(path = "") {
    if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path;

    const root = APP_ROOT;
    if (path.startsWith("/")) {
      if (root && (path === root || path.startsWith(root + "/"))) return path;
      return root + path;
    }

    const cleanPath = path.replace(/^\.\//, "").replace(/^(\.\.\/)+/, "");
    return `${root}/${cleanPath}`;
  }

  function goTo(path) {
    location.href = toAppUrl(path);
  }

  // Reads the temporary local browser session.
  function getSession() {
    try {
      const token = localStorage.getItem("accessToken");
      const raw = localStorage.getItem(SESSION_KEY);
      if (!token || !raw) {
        signOut();
        return null;
      }

      const session = JSON.parse(raw);
      session.role = normalizeRole(session.role);
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    } catch {
      signOut();
      return null;
    }
  }

  function signIn(profile) {
    const email = typeof profile === "string" ? profile : profile.email;
    const role = normalizeRole(typeof profile === "string" ? "User" : (profile.role ?? profile.roles?.[0] ?? "User"));
    const name = typeof profile === "string"
      ? email
      : (profile.name || [profile.firstName, profile.lastName].filter(Boolean).join(" ") || email || "User");
    const initials = name
      .split("@", 1)[0]
      .split(/[._\-\s]+/)
      .filter(Boolean)
      .map(part => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";
    const id = typeof profile === "string" ? null : (profile.userId ?? profile.id ?? profile.employeeId ?? null);
    const s = { id, email, name, initials, role, since: Date.now() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    return s;
  }

  function normalizeRole(role) {
    if (role === 1 || role === "1") return "Manager";
    if (role === 0 || role === "0") return "Labor";
    return role || "User";
  }

  function isManager(session = getSession()) {
    return normalizeRole(session?.role) === "Manager";
  }

  function isLabor(session = getSession()) {
    return normalizeRole(session?.role) === "Labor";
  }

  function defaultHome(session = getSession()) {
    return isManager(session) ? "html/dashboard.html" : "html/schedule.html";
  }

  function applySessionToDom(session) {
    if (!session) return;
    document.querySelectorAll("[data-session-initials]").forEach(el => { el.textContent = session.initials; });
    document.querySelectorAll("[data-session-name]").forEach(el => { el.textContent = session.name; });
    document.querySelectorAll("[data-session-role]").forEach(el => { el.textContent = normalizeRole(session.role); });
  }

  function refreshSessionFromBackend() {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    fetch(toAppUrl("/identity/current-user/claims"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(response => response.ok ? response.json() : null)
      .then(profile => {
        if (!profile) return;
        const session = signIn(profile);
        applySessionToDom(session);
      })
      .catch(() => {});
  }

  function signOut() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("expiresOnUtc");
  }

  Object.assign(window.UI, {
    getSession,
    signIn,
    signOut,
    normalizeRole,
    isManager,
    isLabor,
    appRoot: APP_ROOT,
    toAppUrl,
    goTo,
    defaultHome,
    applySessionToDom,
    refreshSessionFromBackend,
  });
})();
