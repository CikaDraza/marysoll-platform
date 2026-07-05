"use client";
/** BookingDateTimeSection — Izbor datuma i vremena — manual režim nudi samo slobodne definisane termine.
 *  Stanje čita iz BookingProvider konteksta — bez prop drilling-a. */
import { Time24Input } from "@/components/shared/Time24Input";
import { useBookingContext } from "./BookingProvider";


/** "2026-07-15" → "sreda, 15. jul 2026." (za read-only prikaz termina). */
function formatDateSr(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("sr-RS", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
export function BookingDateTimeSection() {
  const {
    selectedDate,
    setSelectedDate,
    selectedTime,
    setSelectedTime,
    isManualMode,
    availableManualTimes,
    manualSlotInvalid,
    availableClassicTimes,
  } = useBookingContext();

  // Zadrži izabrano vreme u ponudi i kad ispadne iz liste (npr. promena
  // usluge produži trajanje) — server svakako validira.
  const classicOptions =
    availableClassicTimes &&
    selectedTime &&
    !availableClassicTimes.includes(selectedTime)
      ? [selectedTime, ...availableClassicTimes]
      : availableClassicTimes;

  return (
    <>
  {/* Date & Time — manual režim: termin iz kalendara je izvor istine,
      bez izmene u modalu; klasičan režim: slobodan izbor datuma/vremena */}
  {isManualMode ? (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1">
        Termin *
      </label>
      {selectedDate && selectedTime && !manualSlotInvalid ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-(--primary-color)/30 bg-(--primary-color)/5 px-4 py-3">
          <span className="text-sm font-bold text-gray-800 capitalize">
            {formatDateSr(selectedDate)}
          </span>
          <span className="shrink-0 text-sm font-bold text-(--primary-color)">
            {selectedTime}
            {(() => {
              const slot = availableManualTimes.find(
                (s) => s.time === selectedTime,
              );
              return slot ? ` (${slot.duration} min)` : "";
            })()}
          </span>
        </div>
      ) : selectedDate && selectedTime ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-600">
            Ovaj termin više nije dostupan. Zatvorite prozor i
            izaberite drugi slobodan termin u kalendaru.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3">
          <p className="text-sm text-gray-500">
            Zatvorite prozor i izaberite slobodan termin u kalendaru.
          </p>
        </div>
      )}
    </div>
  ) : (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Datum *
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="block w-full rounded-xl border border-gray-200 bg-gray-50 text-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary-color)/80"
          required
          min={new Date().toISOString().split("T")[0]}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Vreme *
        </label>
        {classicOptions ? (
          <>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              required
              aria-label="Vreme termina"
              className="block w-full rounded-xl border border-gray-200 bg-gray-50 text-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary-color)/80"
            >
              <option value="">— izaberite vreme —</option>
              {classicOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {selectedDate && classicOptions.length === 0 && (
              <p className="mt-1 text-xs font-semibold text-red-500">
                Nema slobodnih vremena za izabrani datum.
              </p>
            )}
          </>
        ) : (
          <Time24Input
            value={selectedTime}
            onChange={setSelectedTime}
            required
            aria-label="Vreme termina"
            className="block w-full rounded-xl border border-gray-200 bg-gray-50 text-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary-color)/80"
          />
        )}
      </div>
    </div>
  )}
    </>
  );
}
