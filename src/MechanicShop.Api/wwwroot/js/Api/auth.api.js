(function () {
  const request = window.API.request;

  window.API.auth = {
    login(email, password) {
      return request("/identity/token/generate", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },

    currentUser() {
      return request("/identity/current-user/claims");
    },
  };
})();
