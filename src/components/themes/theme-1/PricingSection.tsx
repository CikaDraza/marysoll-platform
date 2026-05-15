"use client";
import Link from "next/link";
import { CheckIcon } from "@heroicons/react/20/solid";
import { formatPriceToString, formatServicePrice } from "@/helpers/formatPrice";
import type { IService } from "@/types";

interface Props {
  services: IService[];
  tenantSlug?: string;
}

function classNames(...c: string[]) {
  return c.filter(Boolean).join(" ");
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

export function Theme1PricingSection({ services, tenantSlug }: Props) {
  const servicesHref = tenantSlug ? `/${tenantSlug}/usluge` : "/usluge";
  const featured = [...services]
    .filter((s) => s.featured && s.featured !== "none")
    .sort((a, b) => {
      const order: Record<string, number> = { second: 0, main: 1, third: 2 };
      return (
        (order[a.featured ?? "none"] ?? 9) - (order[b.featured ?? "none"] ?? 9)
      );
    });

  if (featured.length === 0) return null;

  return (
    <section id="prices" className="relative isolate max-w-7xl mx-auto px-3 lg:px-0 py-12 lg:py-24">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-3 -z-10 transform-gpu overflow-hidden px-36 blur-3xl"
      >
        <div
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
          className="mx-auto aspect-[1155/678] w-[72rem] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30"
        />
      </div>
      <h2 className="text-center text-5xl lg:text-6xl font-bold text-black mb-1">
        Cenovnik
      </h2>
      <p className="text-center text-sm text-(--primary-color)">
        Transparentne cene za vrhunsku uslugu.
      </p>
      <div className="mx-auto my-8 lg:my-24 grid max-w-7xl gap-y-6 grid-cols-1 lg:grid-cols-3">
        {featured.map((srv, idx) => {
          const dark = srv.featured === "main";
          return (
            <div
              key={srv._id}
              className={classNames(
                dark
                  ? "bg-gray-900 h-[110%] translate-y-[-5%] text-gray-100 shadow-2xl ring-1 ring-gray-700"
                  : "bg-white/60 text-gray-900 ring-1 ring-gray-900/10",
                idx === 1
                  ? ""
                  : idx === 0
                    ? "rounded-t-3xl sm:rounded-b-none lg:rounded-tr-none lg:rounded-bl-3xl"
                    : "sm:rounded-t-none lg:rounded-tr-3xl lg:rounded-bl-none",
                "rounded-3xl p-8 sm:p-10",
              )}
            >
              <h3
                className={classNames(
                  dark ? "text-white" : "text-(--primary-color)",
                  "font-semibold text-base mb-1",
                )}
              >
                {srv.name}
              </h3>
              <p
                className={classNames(
                  dark ? "text-gray-400" : "text-gray-500",
                  "text-xs",
                )}
              >
                {srv.category}
                {srv.subcategory ? ` · ${srv.subcategory}` : ""}
              </p>
              {srv.type === "single" && (
                <p className="mt-4 flex items-baseline gap-2">
                  <span
                    className={classNames(
                      dark ? "text-white" : "text-gray-900",
                      "text-4xl font-bold",
                    )}
                  >
                    {formatServicePrice(srv.basePrice, srv.priceMode, "")}
                  </span>
                  {srv.priceMode !== "on_request" && (
                    <span
                      className={classNames(
                        dark ? "text-gray-400" : "text-gray-500",
                        "text-sm",
                      )}
                    >
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
                        <p className="mt-4 flex items-baseline gap-1">
                          <span
                            className={classNames(
                              dark ? "text-gray-400" : "text-gray-500",
                              "text-sm",
                            )}
                          >
                            od
                          </span>
                          <span
                            className={classNames(
                              dark ? "text-white" : "text-gray-900",
                              "text-3xl font-bold",
                            )}
                          >
                            {formatPriceToString(mp)}
                          </span>
                          <span
                            className={classNames(
                              dark ? "text-gray-400" : "text-gray-500",
                              "text-sm",
                            )}
                          >
                            RSD
                          </span>
                        </p>
                      )}
                      {srv.type === "variant" &&
                        (srv.variants ?? []).length > 0 && (
                          <ul className="mt-3 space-y-2 text-sm">
                            {srv.variants!.map((v, i) => (
                              <li
                                key={i}
                                className="flex justify-between items-center gap-x-4"
                              >
                                <span>{v.name}</span>
                                <hr className="flex-1 border-dashed border-gray-300" />
                                <span className="font-semibold">
                                  {formatServicePrice(v.price, v.priceMode)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      {srv.type === "group" &&
                        (srv.services ?? []).length > 0 && (
                          <ul className="mt-3 space-y-2 text-sm">
                            {srv.services!.map((sv, i) => (
                              <li
                                key={i}
                                className="flex justify-between items-center gap-x-4"
                              >
                                <span>{sv.name}</span>
                                {sv.price != null && (
                                  <>
                                    <hr className="flex-1 border-dashed border-gray-300" />
                                    <span className="font-semibold">
                                      {formatServicePrice(sv.price, sv.priceMode)}
                                    </span>
                                  </>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                    </>
                  );
                })()}
              {(srv.extras ?? []).length > 0 && (
                <div className="mt-3">
                  <p
                    className={classNames(
                      dark ? "text-gray-400" : "text-gray-500",
                      "text-xs font-semibold uppercase tracking-wider mb-1",
                    )}
                  >
                    Dodaci
                  </p>
                  <ul className="space-y-1 text-xs">
                    {srv.extras!.map((e, i) => (
                      <li
                        key={i}
                        className="flex justify-between items-center gap-x-4"
                      >
                        <span
                          className={dark ? "text-gray-300" : "text-gray-600"}
                        >
                          + {e.name}
                        </span>
                        <span
                          className={dark ? "text-gray-300" : "text-gray-600"}
                        >
                          {formatServicePrice(e.price || 0, e.priceMode)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(srv.items?.length ?? 0) > 0 && (
                <ul
                  className={classNames(
                    dark ? "text-gray-200" : "text-gray-700",
                    "mt-8 space-y-3 text-xs",
                  )}
                >
                  {srv.items.map((item, i) => (
                    <li key={i} className="flex gap-x-3">
                      <CheckIcon
                        className={classNames(
                          dark ? "text-indigo-400" : "text-(--primary-color)",
                          "h-5 w-4 flex-none",
                        )}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      <Link
        href={servicesHref}
        className="text-sm text-(--primary-color) font-semibold hover:underline"
      >
        Pogledaj sve cene →
      </Link>
    </section>
  );
}
