import type { ClientSession } from "mongoose";
import type { BookedAppointment } from "./availabilityAdapter";
import { Appointment } from "@/models/Appointment";

/**
 * Transitional Slice 5 reader. Povezani Appointment se namerno izostavlja jer
 * njegov BookingReservation već ulazi kao canonical occupancy.
 */
export async function loadUnmigratedAppointmentOccupancy(input: {
  tenantId: string;
  localDate: string;
  session: ClientSession;
}): Promise<BookedAppointment[]> {
  return Appointment.find({
    tenantId: input.tenantId,
    date: input.localDate,
    $or: [
      { bookingReservationId: { $exists: false } },
      { bookingReservationId: null },
    ],
  })
    .session(input.session)
    .select("date time duration status")
    .lean<BookedAppointment[]>();
}
