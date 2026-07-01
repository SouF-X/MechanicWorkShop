(function () {
  // Clones one template root element.
  function cloneTemplate(id) {
    return document.getElementById(id).content.firstElementChild.cloneNode(true);
  }

  window.InvoiceDom = { cloneTemplate };
})();
