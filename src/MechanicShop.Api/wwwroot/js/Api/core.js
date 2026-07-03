(function () {
  // Build API URLs from the deployed app root so the site works at `/`, `/index.html`,
  // or under a hosted sub-path such as `/demo/`.
  const toApiUrl = (path) => window.UI?.toAppUrl ? window.UI.toAppUrl(path) : path;

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
    const res = await fetchWithRefresh(path, options);

    if (!res.ok) {
      throw new Error(await getErrorMessage(res));
    }

    if (res.status === 204) {
      return null;
    }

    return res.json();
  }

  async function requestBlob(path, options = {}) {
    const blobOptions = { ...options };
    const headers = buildHeaders(blobOptions);
    delete headers["Content-Type"];
    blobOptions.headers = headers;

    const res = await fetchWithRefresh(path, blobOptions, { headersAlreadyBuilt: true });

    if (!res.ok) {
      throw new Error(await getErrorMessage(res));
    }

    return res.blob();
  }

  async function fetchWithRefresh(path, options = {}, { headersAlreadyBuilt = false } = {}) {
    const res = await fetch(toApiUrl(path), {
      ...options,
      headers: headersAlreadyBuilt ? options.headers : buildHeaders(options),
    });

    if (res.status !== 401 || options._retry || isAuthEndpoint(path)) {
      return res;
    }

    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      window.UI?.signOut?.();
      if (location.pathname.includes("/html/")) {
        window.UI?.goTo ? window.UI.goTo("index.html") : (location.href = "../index.html");
      }
      return res;
    }

    return fetch(toApiUrl(path), {
      ...options,
      _retry: true,
      headers: headersAlreadyBuilt ? rebuildAuthorizationHeader(options.headers) : buildHeaders(options),
    });
  }

  function isAuthEndpoint(path) {
    return path.startsWith("/identity/token/");
  }

  function rebuildAuthorizationHeader(headers = {}) {
    const token = localStorage.getItem("accessToken");
    return {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  let refreshPromise = null;

  async function refreshAccessToken() {
    const expiredAccessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");

    if (!expiredAccessToken || !refreshToken) {
      return false;
    }

    if (!refreshPromise) {
      refreshPromise = fetch(toApiUrl("/identity/token/refresh-token"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken, expiredAccessToken }),
      })
        .then(async (res) => {
          if (!res.ok) return false;

          const tokens = await res.json();
          localStorage.setItem("accessToken", tokens.accessToken);
          localStorage.setItem("refreshToken", tokens.refreshToken);
          localStorage.setItem("expiresOnUtc", tokens.expiresOnUtc);
          return true;
        })
        .catch(() => false)
        .finally(() => {
          refreshPromise = null;
        });
    }

    return refreshPromise;
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
  window.API.refreshAccessToken = refreshAccessToken;
})();
