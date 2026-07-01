(function () {
  // Clones the settings page template into the shell body.
  function templateFragment(id) {
    return document.getElementById(id).content.cloneNode(true);
  }

  window.SettingsDom = { templateFragment };
})();
