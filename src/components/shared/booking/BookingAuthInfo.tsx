"use client";
/** BookingAuthInfo — Info traka: ulogovan korisnik ili gost tokovi (prijava / nastavi kao gost).
 *  Stanje čita iz BookingProvider konteksta — bez prop drilling-a. */

import { useBookingContext } from "./BookingProvider";

export function BookingAuthInfo() {
  const {
    isLoggedIn,
    userName,
    userEmail,
    showGuestForm,
    setShowGuestForm,
    doGuestReserve,
  } = useBookingContext();

  return (
    <>
{/* Auth info */}
{isLoggedIn ? (
  <div className="mb-4 p-3 bg-(--primary-color)/10 rounded-xl border border-(--primary-color)/10">
    <p className="text-xs text-(--primary-color) font-semibold">
      Zakazujete kao: {userName} ({userEmail})
    </p>
  </div>
) : (
  <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100 space-y-2">
    {!showGuestForm ? (
      <>
        <div className="flex items-start gap-2">
          <p className="flex-1 text-xs text-amber-700 font-semibold leading-relaxed">
            Niste prijavljeni. Popunite formu i kliknite &quot;Postavi
            za rezervaciju&quot; — bićete preusmereni na prijavu.
            Nakon prijave vaš termin će biti potvrđen.
          </p>
          <button
            type="button"
            onClick={doGuestReserve}
            className="shrink-0 text-xs font-bold text-amber-700 border border-amber-300 bg-white hover:bg-amber-50 px-2.5 py-1 rounded-lg transition"
          >
            Prijavi se →
          </button>
        </div>
        <div className="flex items-center justify-between pt-1.5 border-t border-amber-100">
          <span className="text-xs text-amber-600">
            Ili zakažite termin kao gost
          </span>
          <button
            type="button"
            onClick={() => setShowGuestForm(true)}
            className="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition"
          >
            Nastavljam kao gost
          </button>
        </div>
      </>
    ) : (
      <div className="flex items-center justify-between">
        <p className="text-xs text-amber-700 font-semibold">
          Zakazujete kao gost — unesite podatke ispod
        </p>
        <button
          type="button"
          onClick={() => setShowGuestForm(false)}
          className="text-xs text-amber-600 hover:text-amber-800 underline"
        >
          ← Imam nalog
        </button>
      </div>
    )}
  </div>
)}
    </>
  );
}
