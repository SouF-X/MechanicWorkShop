(function () {
  // Clones one template root element.
  function cloneTemplate(id) {
    return document.getElementById(id).content.firstElementChild.cloneNode(true);
  }

  // Clones full template fragments for modal bodies and actions.
  function templateFragment(id) {
    return document.getElementById(id).content.cloneNode(true);
  }

  window.WorkOrderDom = { cloneTemplate, templateFragment };
})();
