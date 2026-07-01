(function () {
  // Clones one template root element.
  function cloneTemplate(id) {
    return document.getElementById(id).content.firstElementChild.cloneNode(true);
  }

  // Clones full template fragments like the page/action templates.
  function templateFragment(id) {
    return document.getElementById(id).content.cloneNode(true);
  }

  window.ScheduleDom = { cloneTemplate, templateFragment };
})();
