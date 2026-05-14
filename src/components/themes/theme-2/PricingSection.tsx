"use client";
import Link from "next/link";
import { formatPriceToString, formatServicePrice } from "@/helpers/formatPrice";
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

export function Theme2PricingSection({ services, tenantSlug }: Props) {
  const base = tenantSlug ? `/${tenantSlug}` : "";
  const featured = [...services]
    .filter((s) => s.featured && s.featured !== "none")
    .sort((a, b) => {
      const o: Record<string, number> = { second: 0, main: 1, third: 2 };
      return (o[a.featured ?? "none"] ?? 9) - (o[b.featured ?? "none"] ?? 9);
    });
  if (!featured.length) return null;

  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="w-12 h-0.5 bg-(--primary-color) mx-auto mb-4" />
        <h2 className="text-3xl font-black text-black text-center mb-4">
          Cenovnik
        </h2>
        <p className="text-gray-600 text-center text-sm mb-16">
          Premium tretmani po transparentnim cenama
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featured.map((srv) => {
            const gold = srv.featured === "main";
            return (
              <div
                key={srv._id}
                className={`rounded-2xl p-7 border ${gold ? "bg-yellow-500" : "bg-gray-950 border-gray-950 transition"}`}
              >
                <h3
                  className={`font-bold text-base mb-1 ${gold ? "text-gray-950" : "text-white"}`}
                >
                  {srv.name}
                </h3>
                <p
                  className={`${gold ? "text-gray-950" : "text-white"} text-xs mb-5`}
                >
                  {srv.category}
                </p>
                {srv.type === "single" && (
                  <p className="mb-4">
                    <span
                      className={`text-4xl font-black ${gold ? "text-gray-950" : "text-white"}`}
                    >
                      {formatServicePrice(srv.basePrice, srv.priceMode, "")}
                    </span>
                    {srv.priceMode !== "on_request" && (
                      <span className="text-gray-600 text-sm ml-1">
                        RSD /terminu
                      </span>
                    )}
                  </p>
                )}
                {(srv.type === "variant" || srv.type === "group") &&
                  (() => {
                    const mp = minPrice(srv);
                    return (
                      <>
                        {mp != null && (
                          <p className="mb-3 flex items-baseline gap-1">
                            <span className="text-gray-200 text-sm">od</span>
                            <span
                              className={`text-3xl font-black ${gold ? "text-gray-950" : "text-white"}`}
                            >
                              {formatPriceToString(mp)}
                            </span>
                            <span className="text-gray-200 text-sm">RSD</span>
                          </p>
                        )}
                        {srv.type === "variant" &&
                          (srv.variants ?? []).map((v, i) => (
                            <div
                              key={i}
                              className="flex justify-between items-center gap-x-4 text-sm mb-1"
                            >
                              <span
                                className={
                                  gold ? "text-gray-950" : "text-white"
                                }
                              >
                                {v.name}
                              </span>
                              <hr
                                className={`flex-1 border-dashed ${gold ? "border-gray-900" : "border-gray-600"}`}
                              />
                              <span
                                className={`${gold ? "text-gray-950" : "text-white"} font-bold`}
                              >
                                {formatServicePrice(v.price, v.priceMode)}
                              </span>
                            </div>
                          ))}
                        {srv.type === "group" &&
                          (srv.services ?? []).map((sv, i) => (
                            <div
                              key={i}
                              className="flex justify-between items-center gap-x-4 text-sm mb-1"
                            >
                              <span
                                className={
                                  gold ? "text-gray-950" : "text-white"
                                }
                              >
                                {sv.name}
                              </span>
                              {sv.price != null && (
                                <>
                                  <hr
                                    className={`flex-1 border-dashed ${gold ? "border-gray-900" : "border-gray-600"}`}
                                  />
                                  <span
                                    className={`${gold ? "text-gray-950" : "text-white"} font-bold`}
                                  >
                                    {formatServicePrice(sv.price, sv.priceMode)}
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
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-200 mb-1">
                      Dodaci
                    </p>
                    {srv.extras!.map((e, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-xs mb-0.5"
                      >
                        <span
                          className={gold ? "text-gray-900" : "text-gray-200"}
                        >
                          + {e.name}
                        </span>
                        <span
                          className={gold ? "text-gray-900" : "text-gray-200"}
                        >
                          {formatServicePrice(e.price || 0, e.priceMode)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {srv.description && (
                  <p
                    className={
                      gold
                        ? "text-gray-900 text-xs mt-3"
                        : "text-gray-200 text-xs mt-3 leading-relaxed"
                    }
                  >
                    {srv.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-center mt-8">
          <Link
            href={base + "/usluge"}
            className="text-sm text-(--primary-color) hover:text-yellow-400 font-semibold"
          >
            Pogledaj sve usluge →
          </Link>
        </p>
      </div>
    </section>
  );
}
