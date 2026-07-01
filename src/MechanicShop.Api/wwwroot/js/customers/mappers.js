(function () {
  // Converts backend CustomerDto names into the shape the Customers UI uses.
  function mapCustomer(dto) {
    return {
      id: dto.customerId,
      name: dto.name,
      phone: dto.phoneNumber,
      email: dto.email,
      since: new Date().toISOString(),
      vehicles: (dto.vehicles || []).map((v) => ({
        id: v.vehicleId,
        customerId: dto.customerId,
        make: v.make,
        model: v.model,
        year: v.year,
        plate: v.licensePlate,
        vin: "",
        mileage: 0,
      })),
    };
  }

  // Converts the frontend customer shape back to the backend create/update request shape.
  function toCustomerPayload(customer) {
    return {
      name: customer.name,
      phoneNumber: customer.phone,
      email: customer.email,
      vehicles: customer.vehicles.map((v) => ({
        vehicleId: v.id || null,
        make: v.make,
        model: v.model,
        year: v.year,
        licensePlate: v.plate,
      })),
    };
  }

  window.CustomerMappers = {
    mapCustomer,
    toCustomerPayload,
  };
})();
