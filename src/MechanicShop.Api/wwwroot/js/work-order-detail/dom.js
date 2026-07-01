(function () {
  // Clones one template root element.
  function cloneTemplate(id) {
    return document.getElementById(id).content.firstElementChild.cloneNode(true);
  }

  // Clones a template fragment for shell actions.
  function templateFragment(id) {
    return document.getElementById(id).content.cloneNode(true);
  }

  window.WorkOrderDetailDom = { cloneTemplate, templateFragment };
})();
