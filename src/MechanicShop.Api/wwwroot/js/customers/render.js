(function () {
  const I = window.ICONS;
  const { confirmDialog, toast, initials } = window.UI;
  const { cloneTemplate, templateFragment } = window.CustomerDom;

  function render() {
    const page = window.CustomerPage;
    const state = page.state;
    const body = page.body;

    const filtered = state.list.filter((c) =>
      (c.name + " " + c.email + " " + c.phone).toLowerCase().includes(state.q.toLowerCase()),
    );
    const selected = state.list.find((c) => c.id === state.selectedId) || state.list[0];

    body.replaceChildren(cloneTemplate("customers-page-template"));
    body.querySelector("[data-search-icon]").outerHTML = I.search(14);

    const search = body.querySelector("#cust-q");
    search.value = state.q;

    renderCustomerList(body, filtered, selected);

    const detailHost = body.querySelector("[data-customer-detail]");
    if (selected) renderSelectedCustomer(detailHost, selected);

    bindEvents(body, selected);
  }

  function renderCustomerList(body, filtered, selected) {
    const customerList = body.querySelector("[data-customer-list]");

    if (filtered.length === 0) {
      customerList.replaceChildren(cloneTemplate("customer-empty-template"));
      return;
    }

    customerList.replaceChildren(
      ...filtered.map((c) => {
        const node = cloneTemplate("customer-row-template");
        const btn = node.querySelector("[data-id]");
        btn.dataset.id = c.id;
        btn.classList.toggle("active", c.id === selected?.id);
        node.querySelector("[data-customer-initials]").textContent = initials(c.name);
        node.querySelector("[data-customer-name]").textContent = c.name;
        node.querySelector("[data-customer-meta]").textContent =
          c.vehicles.length +
          " vehicle" +
          (c.vehicles.length === 1 ? "" : "s") +
          " \u00b7 since " +
          new Date(c.since).getFullYear();
        node.querySelector("[data-chevron]").innerHTML = I.chevronR(14);
        return node;
      }),
    );
  }

  function bindEvents(body, selected) {
    const page = window.CustomerPage;
    const state = page.state;

    body.querySelector("#cust-q").addEventListener("input", (e) => {
      state.q = e.target.value;
      render();
      document.getElementById("cust-q").focus();
    });

    body.querySelectorAll("[data-id]").forEach((btn) =>
      btn.addEventListener("click", () => {
        state.selectedId = btn.dataset.id;
        render();
      }),
    );

    body.querySelector("[data-edit]")?.addEventListener("click", () => {
      window.CustomerForms.openCustomerForm(selected);
    });

    body.querySelector("[data-del-cust]")?.addEventListener("click", () => {
      confirmDialog({
        title: "Delete this customer?",
        description: "This will permanently remove the customer record and all associated vehicles. This action cannot be undone.",
        confirmLabel: "Delete customer",
        onConfirm: () => {
          window.API.customers
            .remove(selected.id)
            .then(() => {
              toast("Customer deleted");
              page.loadCustomers(null);
            })
            .catch((err) => {
              console.error(err);
              toast("Could not delete customer");
            });
        },
      });
    });

    body.querySelector("#add-veh")?.addEventListener("click", () => {
      window.CustomerForms.openVehicleForm(selected);
    });

    body.querySelectorAll("[data-edit-veh]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const vehicle = selected.vehicles.find((v) => v.id === btn.dataset.editVeh);
        window.CustomerForms.openVehicleForm(selected, vehicle);
      }),
    );

    body.querySelectorAll("[data-del-veh]").forEach((btn) =>
      btn.addEventListener("click", () => deleteVehicle(selected, btn.dataset.delVeh)),
    );
  }

  function deleteVehicle(customer, vehicleId) {
    const page = window.CustomerPage;
    const { toCustomerPayload } = window.CustomerMappers;

    if (customer.vehicles.length <= 1) {
      toast("Customer must have at least one vehicle");
      return;
    }

    confirmDialog({
      title: "Remove this vehicle?",
      description: "The vehicle will be removed from this customer's file.",
      confirmLabel: "Remove vehicle",
      onConfirm: () => {
        const updatedCustomer = {
          ...customer,
          vehicles: customer.vehicles.filter((v) => v.id !== vehicleId),
        };

        window.API.customers
          .update(customer.id, toCustomerPayload(updatedCustomer))
          .then(() => {
            toast("Vehicle removed");
            page.loadCustomers(customer.id);
          })
          .catch((err) => {
            console.error(err);
            toast("Could not remove vehicle");
          });
      },
    });
  }

  function renderSelectedCustomer(host, selected) {
    const node = templateFragment("customer-detail-template");
    node.querySelector("[data-detail-name]").textContent = selected.name;
    node.querySelector("[data-detail-since]").textContent = "Customer since " + new Date(selected.since).toLocaleDateString();
    node.querySelector("[data-edit]").dataset.edit = selected.id;
    node.querySelector("[data-del-cust]").dataset.delCust = selected.id;
    node.querySelector("[data-edit-icon]").innerHTML = I.pencil(12);
    node.querySelector("[data-trash-icon]").innerHTML = I.trash(12);
    node.querySelector("[data-phone-icon]").innerHTML = I.phone(14);
    node.querySelector("[data-mail-icon]").innerHTML = I.mail(14);
    node.querySelector("[data-add-icon]").innerHTML = I.plus(12);
    node.querySelector("[data-detail-phone]").textContent = selected.phone;
    node.querySelector("[data-detail-email]").textContent = selected.email;
    node.querySelector("[data-vehicle-count]").textContent = selected.vehicles.length + " on file";

    const vehicleList = node.querySelector("[data-vehicle-list]");
    if (selected.vehicles.length === 0) {
      vehicleList.replaceChildren(cloneTemplate("vehicle-empty-template"));
    } else {
      vehicleList.replaceChildren(...selected.vehicles.map(renderVehicleRow));
    }

    host.replaceChildren(node);
  }

  function renderVehicleRow(vehicle) {
    const row = cloneTemplate("vehicle-row-template");
    row.querySelector("[data-vehicle-icon]").innerHTML = I.car(16);
    row.querySelector("[data-vehicle-title]").textContent = vehicle.year + " " + vehicle.make + " " + vehicle.model;
    row.querySelector("[data-vehicle-meta]").textContent = "Plate " + vehicle.plate;

    const edit = row.querySelector("[data-edit-veh]");
    const del = row.querySelector("[data-del-veh]");
    edit.dataset.editVeh = vehicle.id;
    del.dataset.delVeh = vehicle.id;
    edit.innerHTML = I.pencil(13);
    del.innerHTML = I.trash(13);
    return row;
  }

  window.CustomerRender = {
    render,
    renderSelectedCustomer,
  };
})();
