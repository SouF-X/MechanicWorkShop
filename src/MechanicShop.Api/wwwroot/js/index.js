(function () {
  /*
    Login / landing page
    - Renders marketing/login icons.
    - Calls the real backend login endpoint.
    - Stores the authenticated user session for the app shell.
  */

  // Render icon placeholders from data attributes in index.html.
  document.querySelectorAll("[data-icon]").forEach((el) => {
    const name = el.dataset.icon;
    const size = Number(el.dataset.size || 20);
    if (window.ICONS[name]) el.innerHTML = window.ICONS[name](size);
  });
  document.getElementById("year").textContent = new Date().getFullYear();

  // If a local session exists, skip the login screen.
  const existingSession = window.UI.getSession();
  if (existingSession) {
    location.href = window.UI.defaultHome(existingSession);
    return;
  }

  // Login form elements.
  const form = document.getElementById("login-form");
  const errEl = document.getElementById("login-error");
  const btn = document.getElementById("login-submit");
  const lbl = document.getElementById("login-label");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    errEl.classList.add("hidden");
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    if (!email || !password) return showError("Enter your email and password.");
    if (password.length < 3) return showError("Incorrect email or password.");

    btn.disabled = true;
    lbl.textContent = "Signing in...";

    window.API.auth
      .login(email, password)
      .then((tokens) => {
        localStorage.setItem("accessToken", tokens.accessToken);
        localStorage.setItem("refreshToken", tokens.refreshToken);
        localStorage.setItem("expiresOnUtc", tokens.expiresOnUtc);

        return window.API.auth.currentUser();
      })
      .then((profile) => {
        const session = window.UI.signIn(profile);
        location.href = window.UI.defaultHome(session);
      })
      .catch((err) => {
        showError(err.message);
        btn.disabled = false;
        lbl.textContent = "Enter command center";
      });
  });

  // Displays a simple inline login error.
  function showError(msg) {
    errEl.textContent = msg;
    errEl.classList.remove("hidden");
  }
})();
