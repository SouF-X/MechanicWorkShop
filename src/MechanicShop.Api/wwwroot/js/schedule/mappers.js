(function () {
  const SPOTS = ["Bay 1", "Bay 2", "Bay 3", "Bay 4"];
  const STATES = ["Scheduled", "InProgress", "Completed", "Cancelled"];

  // Converts JS Date to backend route date format: yyyy-mm-dd.
  function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Maps backend schedule response into board bays/slots/jobs.
  function mapSchedule(dto) {
    const spots = dto.spots || dto.Spots || [];
    const bays = spots.map((spot) => spotName(spot.spot ?? spot.Spot));
    const slots = collectSlots(spots);
    const jobs = [];

    spots.forEach((spot) => {
      (spot.slots || spot.Slots || []).forEach((slot) => {
        const workOrderId = slot.workOrderId ?? slot.WorkOrderId;
        const labor = slot.labor ?? slot.Labor;
        if (!(slot.isOccupied ?? slot.IsOccupied) || !workOrderId) return;
        jobs.push({
          id: workOrderId,
          bay: spotName(slot.spot ?? slot.Spot ?? spot.spot ?? spot.Spot),
          slot: timeKey(slot.startAt ?? slot.StartAt),
          customer: labor?.name || labor?.Name || "Scheduled job",
          vehicle: slot.vehicle || slot.Vehicle || "Vehicle",
          number: String(workOrderId).slice(0, 8),
          state: stateName(slot.state ?? slot.State),
        });
      });
    });

    return { bays, slots, jobs };
  }

  // Maps spot enum value to visible bay name.
  function spotName(value) {
    return SPOTS[Number(value)] || String(value || "Bay");
  }

  // Maps work order state enum value to frontend state string.
  function stateName(value) {
    return STATES[Number(value)] || "Scheduled";
  }

  // Builds unique visible time slots from backend slots.
  function collectSlots(spots) {
    const values = new Set();
    spots.forEach((spot) => (spot.slots || spot.Slots || []).forEach((slot) => values.add(timeKey(slot.startAt ?? slot.StartAt))));
    return [...values].sort();
  }

  // Converts a backend datetime to HH:mm local time.
  function timeKey(value) {
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  }

  // Fallback mapper from the Work Orders list endpoint when schedule slots are unavailable.
  function mapScheduleFromWorkOrders(result) {
    const items = result.items || result.Items || [];
    const jobs = items.map((item) => {
      const vehicle = item.vehicle || item.Vehicle || {};
      const spot = item.spot ?? item.Spot;
      const workOrderId = item.workOrderId ?? item.WorkOrderId;
      const number = item.workOrderNumber ?? item.WorkOrderNumber;
      const startAt = item.startAtUtc ?? item.StartAtUtc;
      const state = item.state ?? item.State;

      return {
        id: workOrderId,
        bay: spotName(spot),
        slot: timeKey(startAt),
        customer: item.customer || item.Customer || "Scheduled job",
        vehicle: `${vehicle.make || vehicle.Make || ""} ${vehicle.licensePlate || vehicle.LicensePlate || ""}`.trim() || "Vehicle",
        number: number || String(workOrderId).slice(0, 8),
        state: stateName(state),
      };
    });

    const slots = [...new Set(jobs.map((job) => job.slot))].sort();
    return { bays: SPOTS, slots, jobs };
  }

  window.ScheduleMappers = { toDateKey, mapSchedule, mapScheduleFromWorkOrders };
})();
