(function () {
  // Empty API base because the frontend is served by the same ASP.NET Core app.
  const API_BASE = "";

  function buildHeaders(options = {}) {
    const token = localStorage.getItem("accessToken");

    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  async function request(path, options = {}) {
    const res = await fetch(API_BASE + path, {
      headers: buildHeaders(options),
      ...options,
    });

    if (!res.ok) {
      throw new Error(await getErrorMessage(res));
    }

    if (res.status === 204) {
      return null;
    }

    return res.json();
  }

  async function requestBlob(path, options = {}) {
    const headers = buildHeaders(options);
    delete headers["Content-Type"];

    const res = await fetch(API_BASE + path, {
      headers,
      ...options,
    });

    if (!res.ok) {
      throw new Error(await getErrorMessage(res));
    }

    return res.blob();
  }

  async function getErrorMessage(res) {
    const fallback = `Request failed (${res.status})`;

    try {
      const error = await res.json();
      if (error.errors) {
        const messages = Object.values(error.errors)
          .flat()
          .filter(Boolean);
        if (messages.length > 0) return messages.join(" ");
      }
      return error.detail || error.title || fallback;
    } catch {
      return fallback;
    }
  }

  window.API = window.API || {};
  window.API.request = request;
  window.API.requestBlob = requestBlob;
})();
