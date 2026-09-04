"use client";

import Link from "next/link";
import { formatPriceToString, formatServicePrice } from "@/helpers/formatPrice";
import type { IService } from "@/types";
import {
  minServicePrice as minPrice,
  isPriceFrom,
} from "@/helpers/servicePrice";

interface Props {
  services: IService[];
  headline?: string;
  tenantSlug?: string;
}


export function Theme3PricingSoft({ services, headline, tenantSlug }: Props) {
  if (!services.length) return null;

  const base = tenantSlug ? `/${tenantSlug}` : "";

  const grouped = services.reduce<Record<string, IService[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <section id="prices" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl text-center font-semibold text-[#2d2d2d] mb-16">
          {headline || "Usluge i cene"}
        </h2>

        <div className="space-y-10">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#bfa37a] mb-4 border-b border-[#eeeae4] pb-2">
                {category}
              </p>

              <div className="space-y-4">
                {items.map((service) => {
                  return (
                    <div key={service._id}>
                      <div className="flex items-start justify-between border-b border-[#eeeae4] pb-3 gap-4">
                        <div className="flex-1">
                          <p className="text-base font-medium text-[#2d2d2d]">
                            {service.name}
                          </p>
                          {service.subcategory && (
                            <p className="text-xs text-[#bfa37a] mt-0.5">
                              {service.subcategory}
                            </p>
                          )}
                          {service.description && (
                            <p className="text-sm text-[#8a8a8a] mt-0.5">
                              {service.description}
                            </p>
                          )}

                          {/* Variants */}
                          {service.type === "variant" &&
                            (service.variants ?? []).length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {service.variants!.map((v, i) => (
                                  <li
                                    key={i}
                                    className="flex justify-between text-sm text-[#6b6b6b]"
                                  >
                                    <span>{v.name}</span>
                                    <span className="font-medium text-[#bfa37a]">
                                      {formatServicePrice(v.price, v.priceMode)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}

                          {/* Group sub-services */}
                          {service.type === "group" &&
                            (service.services ?? []).length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {service.services!.map((sv, i) => (
                                  <li
                                    key={i}
                                    className="flex justify-between text-sm text-[#6b6b6b]"
                                  >
                                    <span>{sv.name}</span>
                                    {sv.price != null && (
                                      <span className="font-medium text-[#bfa37a]">
                                        {formatServicePrice(sv.price, sv.priceMode)}
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}

                          {/* Extras */}
                          {(service.extras ?? []).length > 0 && (
                            <div className="mt-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8a8a8a] mb-1">
                                Dodaci
                              </p>
                              <ul className="space-y-1">
                                {service.extras!.map((e, i) => (
                                  <li
                                    key={i}
                                    className="flex justify-between text-xs text-[#8a8a8a]"
                                  >
                                    <span>+ {e.name}</span>
                                    <span>
                                      {formatServicePrice(e.price || 0, e.priceMode)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Price — shown for all service types */}
                        {(() => {
                            const mp = minPrice(service);
                            return mp != null ? (
                              <p className="shrink-0 text-sm font-semibold text-[#bfa37a]">
                                {isPriceFrom(service) ? "od " : ""}
                                {formatPriceToString(mp)} RSD
                              </p>
                            ) : null;
                          })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-16">
          <Link
            href={base + "/termini"}
            className="px-10 py-4 bg-[#2d2d2d] text-white rounded-full text-sm tracking-wide hover:bg-black transition"
          >
            Pogledaj slobodne termine
          </Link>
        </div>
      </div>
    </section>
  );
}
