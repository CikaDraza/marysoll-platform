"use client";
/** BookingActions — Dugmad potvrde po toku (ulogovan / gost).
 *  Stanje čita iz BookingProvider konteksta — bez prop drilling-a. */

import { bookingSelectionIncomplete } from "@/lib/booking/widgetPresentation";
import { useBookingContext } from "./BookingProvider";

export function BookingActions() {
  const {
    isSubmitting,
    isLoggedIn,
    selectedVariant,
    showGuestForm,
    guestLoading,
    selectedService,
    manualSlotInvalid,
    handleClose,
    referralVoucherCode,
    intakeRequired,
    onIntakeStep,
    goToIntakeStep,
    backFromIntakeStep,
    selectedDate,
    selectedTime,
    isEditMode,
    onCancelAppointment,
  } = useBookingContext();

  /** Isti uslov koji koči SVA dugmad potvrde — usluga, varijanta, datum, vreme. */
  const selectionIncomplete = bookingSelectionIncomplete({
    service: selectedService,
    variantName: selectedVariant,
    date: selectedDate,
    time: selectedTime,
    manualSlotInvalid,
  });

  // Prvi korak usluge sa zahtevom vodi na „Sledeće", ne na zakazivanje.
  if (intakeRequired && !onIntakeStep) {
    return (
      <div className="flex justify-end gap-2 pt-2">
        {isEditMode && onCancelAppointment && (
          <button
            type="button"
            onClick={onCancelAppointment}
            className="mr-auto px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition cursor-pointer"
          >
            Otkaži termin
          </button>
        )}
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
        >
          Otkaži
        </button>
        <button
          type="button"
          onClick={goToIntakeStep}
          disabled={selectionIncomplete}
          className="px-5 py-2 text-sm font-semibold text-white bg-(--primary-color)/90 hover:bg-(--primary-color) rounded-xl transition disabled:opacity-50 cursor-pointer"
        >
          Sledeće →
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onIntakeStep ? backFromIntakeStep : handleClose}
          className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
        >
          {onIntakeStep ? "← Nazad" : "Otkaži"}
        </button>

        {isLoggedIn ? (
          <button
            type="submit"
            disabled={isSubmitting || selectionIncomplete}
            className="px-5 py-2 text-sm font-semibold text-white bg-(--primary-color)/90 hover:bg-(--primary-color) rounded-xl transition disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting
              ? isEditMode
                ? "Čuvanje..."
                : "Zakazivanje..."
              : isEditMode
                ? "Sačuvaj izmene"
                : "Zakaži termin"}
          </button>
        ) : referralVoucherCode ? (
          <button
            type="submit"
            disabled={selectionIncomplete}
            className="px-5 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition disabled:opacity-50 cursor-pointer"
          >
            Sačuvaj termin i prijavi se →
          </button>
        ) : showGuestForm ? (
          <button
            type="submit"
            disabled={guestLoading || selectionIncomplete}
            className="px-5 py-2 text-sm font-semibold text-white bg-(--primary-color)/90 hover:bg-(--primary-color) rounded-xl transition disabled:opacity-50 cursor-pointer"
          >
            {guestLoading ? "Zakazivanje..." : "Zakaži kao gost"}
          </button>
        ) : (
          <button
            type="submit"
            disabled={selectionIncomplete}
            className="px-5 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition disabled:opacity-50 cursor-pointer"
          >
            Postavi za rezervaciju →
          </button>
        )}
      </div>
    </>
  );
}
