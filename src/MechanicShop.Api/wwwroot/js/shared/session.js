/* Shared auth/session helpers backed by localStorage. */
(function () {
  window.UI = window.UI || {};

  const SESSION_KEY = "mech.session.v1";

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

  function applySessionToDom(session) {
    if (!session) return;
    document.querySelectorAll("[data-session-initials]").forEach(el => { el.textContent = session.initials; });
    document.querySelectorAll("[data-session-name]").forEach(el => { el.textContent = session.name; });
    document.querySelectorAll("[data-session-role]").forEach(el => { el.textContent = normalizeRole(session.role); });
  }

  function refreshSessionFromBackend() {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    fetch("/identity/current-user/claims", {
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
    applySessionToDom,
    refreshSessionFromBackend,
  });
})();
