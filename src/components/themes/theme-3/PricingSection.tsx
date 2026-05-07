"use client";
import Link from "next/link";
import { CheckIcon } from "@heroicons/react/20/solid";
import { formatPriceToString } from "@/helpers/formatPrice";
import type { IService } from "@/types";

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

interface Props {
  services: IService[];
  tenantSlug?: string;
}

export function Theme3PricingSection({ services, tenantSlug }: Props) {
  const featured = [...services]
    .filter((s) => s.featured && s.featured !== "none")
    .sort((a, b) => {
      const order: Record<string, number> = { second: 0, main: 1, third: 2 };
      return (
        (order[a.featured ?? "none"] ?? 9) - (order[b.featured ?? "none"] ?? 9)
      );
    });
  const base = tenantSlug ? `/${tenantSlug}` : "";

  if (!featured.length) return null;

  return (
    <section className="bg-[#FAF8F5] py-20 lg:py-28 px-6">
      <div className="max-w-5xl mx-auto">
        <p className="text-[#C9A990] text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3">
          cenovnik
        </p>
        <h2 className="text-3xl font-light text-[#3D2B1F] text-center mb-16">
          Transparentne cene
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featured.map((srv) => {
            const highlight = srv.featured === "main";
            return (
              <div
                key={srv._id}
                className={`rounded-3xl p-7 border transition ${highlight ? "bg-[#C9A990] border-[#C9A990] shadow-xl shadow-[#C9A990]/20" : "bg-white border-[#EDE5DC] hover:border-[#C9A990]"}`}
              >
                <h3
                  className={`font-medium text-base mb-1 ${highlight ? "text-white" : "text-[#5C4033]"}`}
                >
                  {srv.name}
                </h3>
                <p
                  className={`text-xs mb-5 ${highlight ? "text-white/70" : "text-[#9E7E6E]"}`}
                >
                  {srv.category}
                </p>
                {srv.type === "single" && (
                  <p
                    className={`text-4xl font-light mb-1 ${highlight ? "text-white" : "text-[#3D2B1F]"}`}
                  >
                    {formatPriceToString(srv.basePrice)}
                    <span
                      className={`text-sm ${highlight ? "text-white/70" : "text-[#9E7E6E]"}`}
                    >
                      {" "}
                      RSD /terminu
                    </span>
                  </p>
                )}
                {(srv.type === "variant" || srv.type === "group") &&
                  (() => {
                    const mp = minPrice(srv);
                    return (
                      <>
                        {mp != null && (
                          <p className="mb-2 flex items-baseline gap-1">
                            <span
                              className={`text-sm ${highlight ? "text-white/70" : "text-[#9E7E6E]"}`}
                            >
                              od
                            </span>
                            <span
                              className={`text-3xl font-light ${highlight ? "text-white" : "text-[#3D2B1F]"}`}
                            >
                              {formatPriceToString(mp)}
                            </span>
                            <span
                              className={`text-sm ${highlight ? "text-white/70" : "text-[#9E7E6E]"}`}
                            >
                              RSD
                            </span>
                          </p>
                        )}
                        {srv.type === "variant" &&
                          (srv.variants ?? []).map((v, i) => (
                            <div
                              key={i}
                              className={`flex justify-between items-center gap-x-4 text-sm mb-1 ${highlight ? "text-white" : "text-[#7C6A5E]"}`}
                            >
                              <span>{v.name}</span>
                              <hr className="flex-1 border-dashed border-gray-300" />
                              <span className="font-medium">
                                {formatPriceToString(v.price)} RSD
                              </span>
                            </div>
                          ))}
                        {srv.type === "group" &&
                          (srv.services ?? []).map((sv, i) => (
                            <div
                              key={i}
                              className={`flex justify-between items-center gap-x-4 text-sm mb-1 ${highlight ? "text-white" : "text-[#7C6A5E]"}`}
                            >
                              <span>{sv.name}</span>
                              {sv.price != null && (
                                <>
                                  <hr className="flex-1 border-dashed border-gray-300" />
                                  <span className="font-medium">
                                    {formatPriceToString(sv.price)} RSD
                                  </span>
                                </>
                              )}
                            </div>
                          ))}
                      </>
                    );
                  })()}
                {(srv.extras ?? []).length > 0 && (
                  <div className="mt-2">
                    <p
                      className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${highlight ? "text-white/60" : "text-[#9E7E6E]"}`}
                    >
                      Dodaci
                    </p>
                    {srv.extras!.map((e, i) => (
                      <div
                        key={i}
                        className={`flex justify-between text-xs mb-0.5 ${highlight ? "text-white/80" : "text-[#7C6A5E]"}`}
                      >
                        <span>+ {e.name}</span>
                        <span>{formatPriceToString(e.price)} RSD</span>
                      </div>
                    ))}
                  </div>
                )}
                {srv.description && (
                  <p
                    className={`text-xs mt-3 leading-relaxed ${highlight ? "text-white/80" : "text-[#9E7E6E]"}`}
                  >
                    {srv.description}
                  </p>
                )}
                {(srv.items?.length ?? 0) > 0 && (
                  <ul className="mt-4 space-y-2">
                    {srv.items.map((item) => (
                      <li
                        key={item}
                        className={`flex gap-2 text-xs ${highlight ? "text-white" : "text-[#7C6A5E]"}`}
                      >
                        <CheckIcon
                          className={`h-4 w-4 flex-shrink-0 ${highlight ? "text-white" : "text-[#C9A990]"}`}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href={base + "/termini"}
                  className={`mt-6 block text-center py-2.5 rounded-full text-sm font-medium transition ${highlight ? "bg-white text-[#C9A990] hover:bg-gray-50" : "bg-[#C9A990] text-white hover:bg-[#B8957A]"}`}
                >
                  Zakaži
                </Link>
              </div>
            );
          })}
        </div>
        <p className="text-center mt-8">
          <Link
            href={base + "/usluge"}
            className="text-sm text-[#C9A990] font-medium hover:underline"
          >
            Pogledaj sve usluge →
          </Link>
        </p>
      </div>
    </section>
  );
}
