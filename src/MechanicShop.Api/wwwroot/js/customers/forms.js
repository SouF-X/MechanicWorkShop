(function () {
  const I = window.ICONS;
  const { openModal, toast, initials } = window.UI;
  const { templateFragment, setInputValue } = window.CustomerDom;
  const { toCustomerPayload } = window.CustomerMappers;
  const { validateCustomerFields, validateVehicleFields, showErrors } = window.CustomerValidators;

  function openCustomerForm(customer) {
    const isEdit = !!customer;
    const form = buildCustomerForm(customer, isEdit);
    const footer = templateFragment("modal-footer-template");
    footer.querySelector("[data-save]").textContent = isEdit ? "Save changes" : "Create customer";

    const modal = openModal({
      title: isEdit ? "Edit customer" : "New customer",
      subtitle: isEdit ? "Update contact details" : "Add customer and first vehicle",
      size: "lg",
      body: form,
      footer,
    });

    modal.root.querySelector("[data-cancel]").addEventListener("click", modal.close);
    wireCustomerPreview(modal.root);
    if (!isEdit) wireCreateVehiclePreview(modal.root);

    modal.root.querySelector("[data-save]").addEventListener("click", () => {
      saveCustomer(modal, customer, isEdit);
    });
  }

  function buildCustomerForm(customer, isEdit) {
    const form = templateFragment("customer-form-template");
    form.querySelector("#prev-init").textContent = initials(customer?.name || "??");
    form.querySelector("#prev-name").textContent = customer?.name || "New customer";
    form.querySelector("[data-name-icon]").outerHTML = I.user(14);
    form.querySelector("[data-phone-input-icon]").outerHTML = I.phone(14);
    form.querySelector("[data-email-input-icon]").outerHTML = I.mail(14);
    setInputValue(form, "#f-name", customer?.name || "");
    setInputValue(form, "#f-phone", customer?.phone || "");
    setInputValue(form, "#f-email", customer?.email || "");

    if (!isEdit) {
      addCreateVehicleFields(form);
      addCreateVehiclePreview(form);
    }

    return form;
  }

  function wireCustomerPreview(root) {
    const nameEl = root.querySelector("#f-name");
    nameEl.addEventListener("input", () => {
      const name = nameEl.value.trim();
      root.querySelector("#prev-name").textContent = name || "New customer";
      root.querySelector("#prev-init").textContent = initials(name || "??");
    });
  }

  function saveCustomer(modal, customer, isEdit) {
    const name = modal.root.querySelector("#f-name").value.trim();
    const phone = modal.root.querySelector("#f-phone").value.trim();
    const email = modal.root.querySelector("#f-email").value.trim();
    const errs = validateCustomerFields({ name, phone, email });

    let firstVehicle = null;
    if (!isEdit) {
      firstVehicle = readCreateVehicle(modal.root);
      Object.assign(errs, validateVehicleFields(firstVehicle));
    }

    showErrors(modal.root, errs);
    if (Object.keys(errs).length) return;

    const customerForPayload = isEdit
      ? { ...customer, name, phone, email }
      : { name, phone, email, vehicles: [firstVehicle] };

    const request = isEdit
      ? window.API.customers.update(customer.id, toCustomerPayload(customerForPayload))
      : window.API.customers.create(toCustomerPayload(customerForPayload));

    request
      .then((saved) => {
        const savedId = saved?.customerId || customer?.id;
        modal.close();
        toast(isEdit ? "Customer updated" : "Customer created");
        window.CustomerPage.loadCustomers(savedId);
      })
      .catch((err) => {
        console.error(err);
        toast(isEdit ? "Could not update customer" : "Could not create customer");
      });
  }

  function addCreateVehicleFields(form) {
    form.querySelector(".modal-form-stack").appendChild(templateFragment("create-vehicle-fields-template"));
  }

  function addCreateVehiclePreview(form) {
    const preview = form.querySelector(".preview-pane");
    preview.appendChild(templateFragment("create-vehicle-preview-template"));
    preview.querySelector("[data-create-vehicle-icon]").innerHTML = I.car(32);
  }

  function wireCreateVehiclePreview(root) {
    const update = () => {
      const vehicle = readCreateVehicle(root);
      const title = [vehicle.year || "", vehicle.make, vehicle.model].filter(Boolean).join(" ").trim();
      root.querySelector("[data-create-vehicle-title]").textContent = title || "New vehicle";
      root.querySelector("[data-create-vehicle-plate]").textContent = vehicle.plate || "— — —";
    };

    ["cv-year", "cv-make", "cv-model", "cv-plate"].forEach((id) => {
      root.querySelector("#" + id).addEventListener("input", update);
    });
    update();
  }

  function readCreateVehicle(root) {
    return {
      make: root.querySelector("#cv-make").value.trim(),
      model: root.querySelector("#cv-model").value.trim(),
      year: Number(root.querySelector("#cv-year").value),
      plate: root.querySelector("#cv-plate").value.trim().toUpperCase(),
    };
  }

  function openVehicleForm(customer, vehicle) {
    const isEdit = !!vehicle;
    const form = buildVehicleForm(vehicle);
    const footer = templateFragment("modal-footer-template");
    footer.querySelector("[data-save]").textContent = isEdit ? "Save changes" : "Add vehicle";

    const modal = openModal({
      title: isEdit ? "Edit vehicle" : "Add vehicle",
      subtitle: isEdit ? "Update vehicle details" : "Attach a vehicle to this customer",
      size: "lg",
      body: form,
      footer,
    });

    wireVehiclePreview(modal.root);
    modal.root.querySelector("[data-cancel]").addEventListener("click", modal.close);
    modal.root.querySelector("[data-save]").addEventListener("click", () => {
      saveVehicle(modal, customer, vehicle, isEdit);
    });
  }

  function buildVehicleForm(vehicle) {
    const form = templateFragment("vehicle-form-template");
    form.querySelector("[data-vehicle-preview-icon]").innerHTML = I.car(32);
    form.querySelector("#prev-title").textContent = vehicle ? vehicle.year + " " + vehicle.make + " " + vehicle.model : "New vehicle";
    form.querySelector("#prev-plate").textContent = vehicle?.plate || "\u2014 \u2014 \u2014";
    setInputValue(form, "#v-make", vehicle?.make || "");
    setInputValue(form, "#v-model", vehicle?.model || "");
    setInputValue(form, "#v-year", vehicle?.year || "");
    setInputValue(form, "#v-plate", vehicle?.plate || "");
    return form;
  }

  function wireVehiclePreview(root) {
    const update = () => {
      const vehicle = readVehicle(root);
      const title = [vehicle.year || "", vehicle.make, vehicle.model].filter(Boolean).join(" ").trim();
      root.querySelector("#prev-title").textContent = title || "New vehicle";
      root.querySelector("#prev-plate").textContent = vehicle.plate || "\u2014 \u2014 \u2014";
    };

    ["v-year", "v-make", "v-model", "v-plate"].forEach((id) => {
      root.querySelector("#" + id).addEventListener("input", update);
    });
  }

  function readVehicle(root) {
    return {
      make: root.querySelector("#v-make").value.trim(),
      model: root.querySelector("#v-model").value.trim(),
      year: Number(root.querySelector("#v-year").value),
      plate: root.querySelector("#v-plate").value.trim().toUpperCase(),
    };
  }

  function saveVehicle(modal, customer, vehicle, isEdit) {
    const formVehicle = readVehicle(modal.root);
    const errs = validateVehicleFields(formVehicle);
    showErrors(modal.root, errs);
    if (Object.keys(errs).length) return;

    const nextVehicle = {
      id: vehicle?.id || null,
      customerId: customer.id,
      ...formVehicle,
      vin: vehicle?.vin || "",
      mileage: vehicle?.mileage || 0,
    };

    const updatedCustomer = {
      ...customer,
      vehicles: isEdit
        ? customer.vehicles.map((v) => (v.id === nextVehicle.id ? nextVehicle : v))
        : [...customer.vehicles, nextVehicle],
    };

    window.API.customers
      .update(customer.id, toCustomerPayload(updatedCustomer))
      .then(() => {
        modal.close();
        toast(isEdit ? "Vehicle updated" : "Vehicle added");
        window.CustomerPage.loadCustomers(customer.id);
      })
      .catch((err) => {
        console.error(err);
        toast("Could not save vehicle");
      });
  }

  window.CustomerForms = {
    openCustomerForm,
    openVehicleForm,
  };
})();
