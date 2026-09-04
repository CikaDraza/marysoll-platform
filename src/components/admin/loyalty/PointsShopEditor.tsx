"use client";

/**
 * Points shop — katalog nagrada koje klijentkinja kupuje poenima (T1-4).
 *
 * Namerno JEDNOSTAVAN editor, bez kursa poen→RSD i bez konverzije: poeni se
 * troše isključivo na ponudu koju je salon definisao („500 ⭐ → 500 RSD
 * popusta"). Slobodan unos („potroši 327 poena") ne postoji, jer bi tražio
 * globalni kurs koji ovaj proizvod svesno nema.
 *
 * Forma NIJE autoritet: server ponovo validira svaku ponudu i sam dodeljuje
 * stabilan `id`. Ovde se `id` samo prenosi nazad da izmena i promena redosleda
 * ne bi promenile identitet ponude.
 */
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useServices } from "@/hooks/useServices";
import type { LoyaltyAdminConfig } from "@/types/loyalty-admin";
import { loyaltyInput, loyaltyLabel } from "./loyaltyStyles";

type PointsShopOffer = LoyaltyAdminConfig["pointsShop"][number];

interface Props {
  offers: PointsShopOffer[];
  pointsEmoji: string;
  onChange: (offers: PointsShopOffer[]) => void;
}

const MAX_OFFERS = 6;

function emptyOffer(): PointsShopOffer {
  return {
    costPoints: 500,
    reward: { type: "fixed", value: 500, serviceName: "", expiresDays: 30 },
  };
}

export function PointsShopEditor({ offers, pointsEmoji, onChange }: Props) {
  const { token } = useAuth();
  const { data: services } = useServices({ token: token ?? undefined });
  const [editing, setEditing] = useState<number | null>(null);

  const update = (index: number, next: PointsShopOffer) => {
    onChange(offers.map((offer, i) => (i === index ? next : offer)));
  };

  const add = () => {
    onChange([...offers, emptyOffer()]);
    setEditing(offers.length);
  };

  const remove = (index: number) => {
    onChange(offers.filter((_, i) => i !== index));
    setEditing(null);
  };

  const describe = (offer: PointsShopOffer) => {
    if (offer.reward.type === "percent") return `${offer.reward.value}% popusta`;
    if (offer.reward.type === "fixed") return `${offer.reward.value} RSD popusta`;
    return `Gratis: ${offer.reward.serviceName || "usluga"}`;
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
            {pointsEmoji} Nagrade za poene
          </p>
          <p className="mt-0.5 text-[11px] text-gray-400">
            Klijentkinja bira jednu od ovih ponuda. Poeni se ne troše ni na šta
            drugo.
          </p>
        </div>
        {offers.length < MAX_OFFERS && (
          <button
            type="button"
            onClick={add}
            className="rounded-xl border border-violet-200 px-3 py-1.5 text-xs font-bold text-violet-600 transition hover:bg-violet-50 dark:border-violet-900 dark:hover:bg-violet-950/40"
          >
            + Dodaj nagradu
          </button>
        )}
      </div>

      {offers.length === 0 && (
        <p className="rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500 dark:bg-gray-800/50">
          Nema definisanih nagrada. Dok ih nema, klijentkinja ne može da potroši
          poene.
        </p>
      )}

      <div className="space-y-2">
        {offers.map((offer, index) => (
          <div
            key={offer.id ?? `new-${index}`}
            className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {offer.costPoints} {pointsEmoji} → {describe(offer)}
              </span>
              <span className="flex gap-3 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setEditing(editing === index ? null : index)}
                  className="text-violet-600 hover:underline"
                >
                  {editing === index ? "Zatvori" : "Izmeni"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-rose-600 hover:underline"
                >
                  Obriši
                </button>
              </span>
            </div>

            {editing === index && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className={loyaltyLabel}>Cena u poenima</label>
                  <input
                    type="number"
                    min={1}
                    className={loyaltyInput}
                    value={offer.costPoints}
                    onChange={(e) =>
                      update(index, {
                        ...offer,
                        costPoints: parseInt(e.target.value, 10) || 1,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={loyaltyLabel}>Tip nagrade</label>
                  <select
                    className={loyaltyInput}
                    value={offer.reward.type}
                    onChange={(e) =>
                      update(index, {
                        ...offer,
                        reward: {
                          ...offer.reward,
                          type: e.target.value as
                            | "percent"
                            | "fixed"
                            | "free_service",
                        },
                      })
                    }
                  >
                    <option value="percent">Popust (%)</option>
                    <option value="fixed">Popust (RSD)</option>
                    <option value="free_service">Gratis usluga</option>
                  </select>
                </div>

                {offer.reward.type !== "free_service" && (
                  <div>
                    <label className={loyaltyLabel}>
                      {offer.reward.type === "percent" ? "Procenat" : "Iznos (RSD)"}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={offer.reward.type === "percent" ? 100 : undefined}
                      className={loyaltyInput}
                      value={offer.reward.value}
                      onChange={(e) =>
                        update(index, {
                          ...offer,
                          reward: {
                            ...offer.reward,
                            value: parseInt(e.target.value, 10) || 0,
                          },
                        })
                      }
                    />
                  </div>
                )}

                <div>
                  <label className={loyaltyLabel}>
                    Usluga {offer.reward.type === "free_service" ? "" : "(opciono)"}
                  </label>
                  <select
                    className={loyaltyInput}
                    value={String(offer.reward.serviceId ?? "")}
                    onChange={(e) => {
                      const serviceId = e.target.value;
                      const service = services?.find((s) => s._id === serviceId);
                      update(index, {
                        ...offer,
                        reward: {
                          ...offer.reward,
                          serviceId: serviceId || null,
                          serviceName: service?.name ?? "",
                        },
                      });
                    }}
                  >
                    <option value="">Sve usluge</option>
                    {(services ?? []).map((service) => (
                      <option key={service._id} value={service._id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={loyaltyLabel}>Vaučer važi (dana)</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    className={loyaltyInput}
                    value={offer.reward.expiresDays}
                    onChange={(e) =>
                      update(index, {
                        ...offer,
                        reward: {
                          ...offer.reward,
                          expiresDays: parseInt(e.target.value, 10) || 30,
                        },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
