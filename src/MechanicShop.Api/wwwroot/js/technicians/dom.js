(function () {
  // Clones one template root element.
  function cloneTemplate(id) {
    return document.getElementById(id).content.firstElementChild.cloneNode(true);
  }

  // Clones a full template fragment.
  function templateFragment(id) {
    return document.getElementById(id).content.cloneNode(true);
  }

  window.TechnicianDom = { cloneTemplate, templateFragment };
})();
