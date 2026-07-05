"use client";
/** BookingNoteField — Napomena uz termin.
 *  Stanje čita iz BookingProvider konteksta — bez prop drilling-a. */

import { useBookingContext } from "./BookingProvider";

export function BookingNoteField() {
  const {
    note,
    setNote,
  } = useBookingContext();

  return (
    <>
  {/* Note */}
  <div>
    <label className="block text-xs font-semibold text-gray-700 mb-1">
      Napomena (opciono)
    </label>
    <textarea
      value={note}
      onChange={(e) => setNote(e.target.value)}
      className="block w-full rounded-xl border border-gray-200 bg-gray-50 text-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary-color)/80 placeholder:text-gray-400"
      rows={2}
      placeholder="Dodatne napomene..."
    />
  </div>
    </>
  );
}
