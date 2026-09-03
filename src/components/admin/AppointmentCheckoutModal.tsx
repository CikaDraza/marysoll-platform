"use client";

/**
 * Završi termin — račun, ne gola promena statusa (T1-4 §20–§22).
 *
 * Svaka brojka dolazi sa SERVERA: cena pre pogodnosti, popust, iznos za
 * naplatu, predlog stvarno naplaćenog i očekivana zarada. Modal ne radi
 * `3500 - 500` i ne računa poene — prikazan iznos koji se razlikuje od
 * proknjiženog gori je od nikakvog iznosa.
 *
 * Vlasnica unosi UKUPNU dogovorenu cenu, ne „osnovica + doplate": server iz
 * nje izvodi canonical quote polja.
 */
import { useState } from "react";
import toast from "react-hot-toast";
import { formatPriceToString } from "@/helpers/formatPrice";
import {
  useAppointmentCheckoutPreview,
  useCompleteAppointmentCheckout,
} from "@/hooks/loyalty/useAppointmentCheckout";
import { useDebounce } from "@/hooks/useDebounce";
import type { IAppointment } from "@/types";

interface Props {
  appointment: IAppointment;
  onClose: () => void;
  onCompleted?: () => void;
}

function parseAmount(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

function Row({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 ${
        strong
          ? "border-t border-gray-200 pt-2 font-bold text-gray-900 dark:border-gray-700 dark:text-gray-100"
          : "text-gray-600 dark:text-gray-300"
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function AppointmentCheckoutModal({
  appointment,
  onClose,
  onCompleted,
}: Props) {
  const appointmentId = appointment._id ?? "";
  const [agreedInput, setAgreedInput] = useState("");
  const [chargedInput, setChargedInput] = useState("");

  // Debounce da kucanje ne pravi zahtev po slovu; server ostaje autoritet.
  const agreedDebounced = useDebounce(agreedInput, 350);
  const chargedDebounced = useDebounce(chargedInput, 350);

  const amounts = {
    agreedPrice: parseAmount(agreedDebounced),
    chargedAmount: parseAmount(chargedDebounced),
  };
  const { data: preview, isLoading } = useAppointmentCheckoutPreview(
    appointmentId,
    amounts,
  );
  const complete = useCompleteAppointmentCheckout(appointmentId);

  const money = (amount: number | null | undefined) =>
    amount == null ? "—" : `${formatPriceToString(amount)} ${preview?.currency ?? "RSD"}`;

  const blocked = Boolean(preview?.requiresAgreedPrice);
  const busy = complete.isPending;

  const handleConfirm = async () => {
    try {
      await complete.mutateAsync({
        agreedPrice: parseAmount(agreedInput),
        chargedAmount: parseAmount(chargedInput) ?? preview?.chargedAmountDefault ?? null,
      });
      toast.success("Termin je završen.");
      onCompleted?.();
      onClose();
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Termin nije završen. Pokušajte ponovo.";
      toast.error(message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Završi termin"
        className="w-full max-w-md rounded-3xl border border-gray-100 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <h2 className="font-bold text-gray-800 dark:text-white">Završi termin</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            {appointment.clientName} · {appointment.serviceName}
          </p>
        </div>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto p-6">
          {isLoading && <p className="text-sm text-gray-500">Učitavanje računa…</p>}

          {preview && (
            <>
              {preview.requiresAgreedPrice && (
                <div className="rounded-2xl bg-amber-50 p-4 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  Termin ima pogodnost, a cena pre pogodnosti nije potvrđena.
                  Unesite ukupnu dogovorenu cenu da bi popust mogao da se
                  izračuna.
                </div>
              )}

              {(preview.requiresAgreedPrice ||
                preview.priceBeforeBenefitSource === "unknown" ||
                agreedInput !== "") && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    Dogovorena cena pre pogodnosti (ukupno, RSD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    autoFocus
                    value={agreedInput}
                    onChange={(e) => setAgreedInput(e.target.value)}
                    placeholder="3500"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 focus:ring-2 focus:ring-violet-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  />
                </div>
              )}

              <div className="space-y-1.5 rounded-2xl bg-gray-50 px-4 py-3 text-sm dark:bg-gray-800/50">
                <Row
                  label="Cena / dogovorena cena"
                  value={money(preview.priceBeforeBenefit)}
                />
                {preview.benefit && (
                  <Row
                    label="Pogodnost"
                    value={
                      preview.discountAmount == null
                        ? "—"
                        : `−${formatPriceToString(preview.discountAmount)} ${preview.currency}`
                    }
                  />
                )}
                <Row label="Za naplatu" value={money(preview.amountDue)} strong />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Stvarno naplaćeno (RSD)
                </label>
                <input
                  type="number"
                  min={0}
                  value={chargedInput}
                  onChange={(e) => setChargedInput(e.target.value)}
                  placeholder={
                    preview.chargedAmountDefault != null
                      ? String(preview.chargedAmountDefault)
                      : "bez cene"
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 focus:ring-2 focus:ring-violet-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                />
                <p className="mt-1.5 text-[11px] text-gray-400">
                  Ovaj iznos ulazi u ostvaren prihod i na njemu se obračunava
                  nagrada. Ako ga ostavite prazan, upisuje se iznos za naplatu.
                </p>
              </div>

              {preview.benefit && (
                <div className="rounded-2xl border border-violet-200 px-4 py-3 text-xs dark:border-violet-900">
                  <p className="font-semibold text-violet-800 dark:text-violet-200">
                    Pogodnost: {preview.benefit.label}
                  </p>
                  <p className="mt-0.5 font-mono text-violet-500 dark:text-violet-300">
                    {preview.benefit.code} ·{" "}
                    {preview.benefit.status === "reserved"
                      ? "Rezervisana ✓"
                      : preview.benefit.status}
                  </p>
                </div>
              )}

              {preview.loyaltyEnabled &&
                (preview.expectedEarning.hearts > 0 ||
                  preview.expectedEarning.points > 0) && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Nakon završetka očekivano:{" "}
                    {preview.expectedEarning.hearts > 0 && (
                      <>+{preview.expectedEarning.hearts} ❤️ </>
                    )}
                    {preview.expectedEarning.points > 0 && (
                      <>+{preview.expectedEarning.points} ⭐</>
                    )}
                    {preview.expectedEarning.capped && (
                      <> (umanjeno dnevnim limitom)</>
                    )}
                  </p>
                )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl bg-gray-100 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300"
          >
            Odustani
          </button>
          <button
            type="button"
            disabled={blocked || busy || isLoading}
            onClick={handleConfirm}
            className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
          >
            {busy ? "Čuvanje…" : "Potvrdi — Došla"}
          </button>
        </div>
      </div>
    </div>
  );
}
