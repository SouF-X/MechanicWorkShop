(function () {
  const { renderShell, toast } = window.UI;
  const { templateFragment } = window.CustomerDom;
  const { mapCustomer } = window.CustomerMappers;
  const I = window.ICONS;

  const state = {
    list: [],
    q: "",
    selectedId: null,
  };

  const CustomerPage = {
    state,
    body: null,
    loadCustomers,
  };

  window.CustomerPage = CustomerPage;

  function init() {
    CustomerPage.body = renderShell({
      title: "Customers",
      group: "Records",
      crumb: "Customers",
      actions: templateFragment("customer-actions-template"),
    });

    document
      .getElementById("new-customer")
      .querySelector("[data-new-customer-icon]").innerHTML = I.plus(14);

    document
      .getElementById("new-customer")
      .addEventListener("click", () => window.CustomerForms.openCustomerForm());

    loadCustomers();
  }

  function loadCustomers(preferredId = state.selectedId) {
    window.API.customers
      .list()
      .then((data) => {
        state.list = data.map(mapCustomer);
        state.selectedId = state.list.some((c) => c.id === preferredId)
          ? preferredId
          : state.list[0]?.id || null;
        window.CustomerRender.render();
      })
      .catch((err) => {
        console.error(err);
        toast("Could not load customers");
        window.CustomerRender.render();
      });
  }

  init();
})();
