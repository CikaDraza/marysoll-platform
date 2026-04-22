"use client";

import Link from "next/link";
import { formatPriceToString } from "@/helpers/formatPrice";
import type { IService } from "@/types";

interface Props {
  services: IService[];
  headline?: string;
  tenantSlug?: string;
}

function minPrice(s: IService): number | null {
  if (s.type === "single") return s.basePrice ?? null;
  if (s.type === "variant") {
    const p = (s.variants ?? []).map((v) => v.price);
    return p.length ? Math.min(...p) : null;
  }
  if (s.type === "group") {
    const p = (s.services ?? [])
      .map((sv) => sv.price)
      .filter((x): x is number => x != null);
    return p.length ? Math.min(...p) : null;
  }
  return null;
}

export function Theme3PricingSoft({ services, headline, tenantSlug }: Props) {
  if (!services.length) return null;

  const resolveHref = (href: string) => {
    const prefix = tenantSlug ? `/${tenantSlug}` : "";
    return `${prefix}${href}`;
  };

  const grouped = services.reduce<Record<string, IService[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <section className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-6">
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
                  const mp = minPrice(service);
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
                                      {formatPriceToString(v.price)} RSD
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
                                        {formatPriceToString(sv.price)} RSD
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
                                      {formatPriceToString(e.price)} RSD
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          {mp != null && (
                            <span className="text-base font-semibold text-[#bfa37a] whitespace-nowrap">
                              {service.type !== "single" ? "od " : ""}
                              {formatPriceToString(mp)} RSD
                            </span>
                          )}
                          <Link
                            href={resolveHref("/termini")}
                            className="text-sm text-[#2d2d2d] border border-[#e5e2dc] px-4 py-2 rounded-full hover:bg-[#f3eee8] transition"
                          >
                            Zakaži
                          </Link>
                        </div>
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
            href={resolveHref("/termini")}
            className="px-10 py-4 bg-[#2d2d2d] text-white rounded-full text-sm tracking-wide hover:bg-black transition"
          >
            Pogledaj slobodne termine
          </Link>
        </div>
      </div>
    </section>
  );
}
