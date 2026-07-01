(function () {
  // Clones one template root element for table rows and empty states.
  function cloneTemplate(id) {
    return document.getElementById(id).content.firstElementChild.cloneNode(true);
  }

  // Clones a full template fragment for modal body/footer.
  function templateFragment(id) {
    return document.getElementById(id).content.cloneNode(true);
  }

  window.RepairTaskDom = {
    cloneTemplate,
    templateFragment,
  };
})();
