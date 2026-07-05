"use client";
/** BookingActions — Dugmad potvrde po toku (ulogovan / gost).
 *  Stanje čita iz BookingProvider konteksta — bez prop drilling-a. */

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
  } = useBookingContext();

  return (
    <>
  {/* Actions */}
  <div className="flex justify-end gap-2 pt-2">
    <button
      type="button"
      onClick={handleClose}
      className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
    >
      Otkaži
    </button>

    {isLoggedIn ? (
      <button
        type="submit"
        disabled={
          isSubmitting ||
          manualSlotInvalid ||
          (selectedService?.type === "variant" && !selectedVariant)
        }
        className="px-5 py-2 text-sm font-semibold text-white bg-(--primary-color)/90 hover:bg-(--primary-color) rounded-xl transition disabled:opacity-50 cursor-pointer"
      >
        {isSubmitting
          ? "Zakazivanje..."
          : "Zakaži termin"}
      </button>
    ) : showGuestForm ? (
      <button
        type="submit"
        disabled={
          guestLoading ||
          manualSlotInvalid ||
          (selectedService?.type === "variant" && !selectedVariant)
        }
        className="px-5 py-2 text-sm font-semibold text-white bg-(--primary-color)/90 hover:bg-(--primary-color) rounded-xl transition disabled:opacity-50 cursor-pointer"
      >
        {guestLoading ? "Zakazivanje..." : "Zakaži kao gost"}
      </button>
    ) : (
      <button
        type="submit"
        disabled={
          manualSlotInvalid ||
          (selectedService?.type === "variant" && !selectedVariant)
        }
        className="px-5 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition disabled:opacity-50 cursor-pointer"
      >
        Postavi za rezervaciju →
      </button>
    )}
  </div>
    </>
  );
}
