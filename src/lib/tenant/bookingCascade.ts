import { SalonProfile } from "@/models/SalonProfile";
import { Slot } from "@/models/Slot";
import { BookingReservation } from "@/models/BookingReservation";
import { BookingDayLock } from "@/models/BookingDayLock";
import { BookingOperationReceipt } from "@/models/BookingOperationReceipt";
import { BookingOutboxEvent } from "@/models/BookingOutboxEvent";

export interface TenantBookingCascadeResult {
  slots: number;
  reservations: number;
  dayLocks: number;
  receipts: number;
  outboxEvents: number;
}

/**
 * Briše occupancy podatke jednog tenanta.
 *
 * Dve stvari koje pozivalac ne sme sam da rešava:
 *
 * 1. `Slot` NEMA `tenantId` — vezan je za `SalonProfile` preko `salonId`.
 *    Raniji `Slot.deleteMany({ tenantId })` zato nije brisao ništa (Mongoose
 *    `strictQuery` je podrazumevano `false`, pa filter stigne do baze i ne
 *    poklopi nijedan dokument) i ostavljao je orphan slotove iza obrisanog
 *    salona. Zato se `salonId` mora razrešiti PRE nego što `SalonProfile`
 *    bude obrisan — obe delete rute ga brišu u istom `Promise.all`.
 *
 * 2. Četiri Booking kolekcije iz Slice 5 nisu bile ni u jednoj kaskadi.
 *    Danas je to uspavan dug jer nijedna produkciona ruta još ne piše
 *    rezervacije; postaje stvaran čim Slice 6 prebaci write ulaze.
 */
export async function deleteTenantBookingData(
  tenantId: string,
): Promise<TenantBookingCascadeResult> {
  const salons = await SalonProfile.find({ tenantId }).select("_id").lean<
    Array<{ _id: unknown }>
  >();
  const salonIds = salons.map((salon) => salon._id);

  const [slots, reservations, dayLocks, receipts, outboxEvents] =
    await Promise.all([
      salonIds.length
        ? Slot.deleteMany({ salonId: { $in: salonIds } })
        : Promise.resolve({ deletedCount: 0 }),
      BookingReservation.deleteMany({ tenantId }),
      BookingDayLock.deleteMany({ tenantId }),
      BookingOperationReceipt.deleteMany({ tenantId }),
      BookingOutboxEvent.deleteMany({ tenantId }),
    ]);

  return {
    slots: slots.deletedCount ?? 0,
    reservations: reservations.deletedCount ?? 0,
    dayLocks: dayLocks.deletedCount ?? 0,
    receipts: receipts.deletedCount ?? 0,
    outboxEvents: outboxEvents.deletedCount ?? 0,
  };
}
