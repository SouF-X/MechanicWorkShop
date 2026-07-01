(function () {
  // Clones one HTML template element so render/forms can create fresh DOM nodes.
  function cloneTemplate(id) {
    return document.getElementById(id).content.firstElementChild.cloneNode(true);
  }

  // Clones a full template fragment when the template has multiple root nodes.
  function templateFragment(id) {
    return document.getElementById(id).content.cloneNode(true);
  }

  // Sets an input value safely when opening edit/create forms.
  function setInputValue(root, selector, value) {
    const input = root.querySelector(selector);
    input.setAttribute("value", value ?? "");
  }

  window.CustomerDom = {
    cloneTemplate,
    templateFragment,
    setInputValue,
  };
})();
