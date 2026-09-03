"use client";

/**
 * „Imate pogodnost" — izbor jedne pogodnosti za termin (T1-4).
 *
 * Živi u LOYALTY prezentacionom sloju, ne u booking widget-u: zakazivanje ne
 * sme da zavisi od nagrada. Ako loyalty padne, termin je i dalje zakazan i
 * korisnica dobija normalnu potvrdu — ovaj modal se prosto ne pojavi.
 *
 * Isti komponentni ugovor koristi i klijentkinja (posle zakazivanja) i salon
 * („Primeni pogodnost"), jer iza oba stoji isti server seam.
 *
 * Komponenta NE računa ništa: prikazuje labele i iznose koje je server već
 * izračunao i šalje nazad samo id izbora.
 */
import { useState } from "react";
import toast from "react-hot-toast";
import { formatPriceToString } from "@/helpers/formatPrice";
import {
  useAppointmentBenefits,
  useApplyAppointmentBenefit,
  useRemoveAppointmentBenefit,
  type BenefitChoice,
} from "@/hooks/loyalty/useAppointmentBenefits";

interface Props {
  appointmentId: string;
  /** „client" posle zakazivanja, „admin" iz panela — razlikuje se samo tekst. */
  audience?: "client" | "admin";
  onClose: () => void;
  onApplied?: () => void;
}

function errorMessage(err: unknown): string {
  const response = (err as { response?: { data?: { error?: string } } })?.response;
  return response?.data?.error ?? "Pogodnost nije primenjena. Pokušajte ponovo.";
}

function discountHint(amount: number | null): string | null {
  if (amount == null) return null;
  return `−${formatPriceToString(amount)} RSD na ovaj termin`;
}

export function LoyaltyBenefitPicker({
  appointmentId,
  audience = "client",
  onClose,
  onApplied,
}: Props) {
  const { data, isLoading, isError } = useAppointmentBenefits(appointmentId);
  const apply = useApplyAppointmentBenefit(appointmentId);
  const remove = useRemoveAppointmentBenefit(appointmentId);
  const [choice, setChoice] = useState<BenefitChoice | null>(null);

  const isAdmin = audience === "admin";
  const busy = apply.isPending || remove.isPending;

  const handleApply = async () => {
    if (!choice) return;
    try {
      await apply.mutateAsync(choice);
      toast.success("Pogodnost je primenjena.");
      onApplied?.();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleRemove = async () => {
    try {
      await remove.mutateAsync();
      toast.success("Pogodnost je uklonjena.");
      onApplied?.();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Pogodnost za termin"
        className="w-full max-w-md rounded-3xl border border-gray-100 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <h2 className="font-bold text-gray-800 dark:text-white">
            {isAdmin ? "Primeni pogodnost 🎁" : "Imate pogodnost 🎁"}
          </h2>
          <p className="mt-0.5 text-xs text-gray-400">
            {isAdmin
              ? "Jedna pogodnost po terminu — postojeća se prvo uklanja."
              : "Možete da iskoristite jednu pogodnost na ovom terminu."}
          </p>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-6">
          {isLoading && (
            <p className="text-sm text-gray-500">Učitavanje pogodnosti…</p>
          )}

          {isError && (
            <p className="text-sm text-gray-500">
              Pogodnosti trenutno nisu dostupne. Termin je zakazan i ostaje
              nepromenjen.
            </p>
          )}

          {data?.applied && (
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950/40">
              <p className="text-sm font-bold text-violet-800 dark:text-violet-200">
                Već primenjeno: {data.applied.label}
              </p>
              <p className="mt-1 font-mono text-xs text-violet-600 dark:text-violet-300">
                {data.applied.code}
              </p>
              {data.applied.discountAmount != null && (
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  Popust: {formatPriceToString(data.applied.discountAmount)} RSD
                  {data.applied.finalPrice != null && (
                    <> · za naplatu {formatPriceToString(data.applied.finalPrice)} RSD</>
                  )}
                </p>
              )}
              {data.editable && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={busy}
                  className="mt-3 text-xs font-semibold text-violet-700 underline hover:text-violet-900 disabled:opacity-50 dark:text-violet-300"
                >
                  Ukloni pogodnost
                </button>
              )}
            </div>
          )}

          {data && !data.applied && !data.hasUsable && (
            <p className="text-sm text-gray-500">
              Trenutno nema pogodnosti koje se mogu iskoristiti na ovom terminu.
            </p>
          )}

          {data && !data.applied && data.hasUsable && (
            <div className="space-y-2">
              {data.vouchers.map((voucher) => {
                const selected =
                  choice?.kind === "voucher" && choice.voucherId === voucher.voucherId;
                return (
                  <label
                    key={voucher.voucherId}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                      selected
                        ? "border-violet-400 bg-violet-50 dark:bg-violet-950/40"
                        : "border-gray-200 hover:border-violet-300 dark:border-gray-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="benefit"
                      className="mt-1"
                      checked={selected}
                      onChange={() =>
                        setChoice({ kind: "voucher", voucherId: voucher.voucherId })
                      }
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-gray-800 dark:text-gray-100">
                        Vaučer — {voucher.label}
                      </span>
                      <span className="block font-mono text-xs text-gray-400">
                        {voucher.code}
                      </span>
                      {discountHint(voucher.previewDiscount) && (
                        <span className="mt-1 block text-xs text-emerald-600 dark:text-emerald-400">
                          {discountHint(voucher.previewDiscount)}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}

              {data.offers.map((offer) => {
                const selected =
                  choice?.kind === "points_shop" && choice.offerId === offer.offerId;
                return (
                  <label
                    key={offer.offerId}
                    className={`flex items-start gap-3 rounded-2xl border p-4 transition ${
                      !offer.eligible
                        ? "cursor-not-allowed border-gray-100 opacity-60 dark:border-gray-800"
                        : selected
                          ? "cursor-pointer border-violet-400 bg-violet-50 dark:bg-violet-950/40"
                          : "cursor-pointer border-gray-200 hover:border-violet-300 dark:border-gray-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="benefit"
                      className="mt-1"
                      disabled={!offer.eligible}
                      checked={selected}
                      onChange={() =>
                        setChoice({ kind: "points_shop", offerId: offer.offerId })
                      }
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {offer.costLabel} → {offer.label}
                      </span>
                      {isAdmin && offer.eligible && (
                        <span className="block text-xs text-gray-500">
                          Troši {offer.costLabel} sa računa klijentkinje
                        </span>
                      )}
                      {!offer.applicable && (
                        <span className="block text-xs text-gray-400">
                          Ne važi za izabranu uslugu
                        </span>
                      )}
                      {offer.applicable && !offer.affordable && (
                        <span className="block text-xs text-gray-400">
                          Nedostaje još {offer.missingPoints} {data.pointsEmoji}
                        </span>
                      )}
                      {offer.eligible && discountHint(offer.previewDiscount) && (
                        <span className="mt-1 block text-xs text-emerald-600 dark:text-emerald-400">
                          {discountHint(offer.previewDiscount)}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}

              {data.pointsEnabled && (
                <p className="pt-1 text-xs text-gray-400">
                  Stanje: {data.pointsBalance} {data.pointsEmoji}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl bg-gray-100 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300"
          >
            {data?.applied ? "Zatvori" : "Ne sada"}
          </button>
          {!data?.applied && (
            <button
              type="button"
              disabled={!choice || busy}
              onClick={handleApply}
              className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
            >
              {apply.isPending ? "Primenjujem…" : "Primeni"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
