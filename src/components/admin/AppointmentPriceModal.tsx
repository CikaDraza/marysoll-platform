"use client";
/**
 * Unos cene uz promenu statusa termina.
 *
 * Dva trenutka, oba OPCIONA:
 *
 *   Odobri → salon je video zahtev/fotografiju i zna procenu
 *            → `quotedBaseAmount`; klijentkinja odmah dobija mejl sa cenom
 *
 *   Došla  → posle tretmana zna stvarno naplaćeno
 *            → `chargedAmount`
 *
 * Ako salon preskoči oba, termin ostaje bez cene i ulazi u „Termini bez cene",
 * ne u prihod. Nijedan iznos se ne izmišlja.
 */
import { useState } from "react";
import { formatPriceToString } from "@/helpers/formatPrice";
import type { IAppointment } from "@/types";

interface Props {
  appointment: IAppointment;
  /** "quote" = pri odobravanju, "charged" = pri označavanju dolaska. */
  kind: "quote" | "charged";
  isSaving?: boolean;
  onSkip: () => void;
  onConfirm: (amount: number) => void;
  onClose: () => void;
}

export function AppointmentPriceModal({
  appointment,
  kind,
  isSaving = false,
  onSkip,
  onConfirm,
  onClose,
}: Props) {
  const [value, setValue] = useState("");
  const pricing = appointment.pricing;
  const addons = pricing?.knownAddonsTotal ?? 0;

  const amount = Number(value);
  const valid = value.trim() !== "" && Number.isFinite(amount) && amount >= 0;

  // Pri odobravanju salon unosi OSNOVNU cenu, pa server dodaje poznate doplate.
  const preview = valid && kind === "quote" ? amount + addons : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Unos cene"
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-800 dark:text-white">
            {kind === "quote" ? "Cena usluge" : "Naplaćeno ukupno"}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {appointment.clientName} · {appointment.serviceName}
          </p>
        </div>

        <div className="p-6">
          <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
            {kind === "quote"
              ? "Cena usluge (RSD)"
              : "Ukupno naplaćeno (RSD)"}
          </label>
          <input
            type="number"
            min={0}
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={kind === "quote" ? "3000" : "3900"}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
          />

          {kind === "quote" && addons > 0 && (
            <div className="mt-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 px-4 py-3 text-xs">
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Poznati dodaci</span>
                <span>{formatPriceToString(addons)} RSD</span>
              </div>
              {preview != null && (
                <div className="flex justify-between font-bold text-gray-800 dark:text-gray-100 mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
                  <span>Ukupno</span>
                  <span>{formatPriceToString(preview)} RSD</span>
                </div>
              )}
            </div>
          )}

          <p className="mt-3 text-[11px] text-gray-400">
            {kind === "quote"
              ? "Klijentkinja odmah dobija obaveštenje sa potvrđenom cenom. Ako sada ne znate cenu, možete je uneti kada označite dolazak."
              : "Ovaj iznos ulazi u ostvaren prihod."}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onSkip}
            disabled={isSaving}
            className="text-xs text-gray-400 underline hover:text-gray-600 disabled:opacity-50"
          >
            {kind === "quote" ? "Odobri bez cene" : "Označi bez cene"}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 rounded-xl hover:bg-gray-200 transition disabled:opacity-50"
            >
              Odustani
            </button>
            <button
              type="button"
              disabled={!valid || isSaving}
              onClick={() => onConfirm(amount)}
              className="px-5 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition disabled:opacity-50"
            >
              {isSaving ? "Čuvanje..." : "Sačuvaj cenu"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
