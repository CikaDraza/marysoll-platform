"use client";
import Link from "next/link";
import { CheckIcon } from "@heroicons/react/20/solid";
import { formatPriceToString } from "@/helpers/formatPrice";
import type { IService } from "@/types";

interface Props { services: IService[] }

function classNames(...c: string[]) { return c.filter(Boolean).join(" "); }

export function Theme1PricingSection({ services }: Props) {
  const featured = [...services]
    .filter(s => s.featured && s.featured !== "none")
    .sort((a, b) => {
      const order: Record<string, number> = { second: 0, main: 1, third: 2 };
      return (order[a.featured ?? "none"] ?? 9) - (order[b.featured ?? "none"] ?? 9);
    });

  if (featured.length === 0) return null;

  return (
    <section className="relative isolate w-full py-12 lg:py-24">
      <div aria-hidden="true" className="absolute inset-x-0 -top-3 -z-10 transform-gpu overflow-hidden px-36 blur-3xl">
        <div style={{ clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" }}
          className="mx-auto aspect-[1155/678] w-[72rem] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30" />
      </div>
      <h2 className="text-center text-3xl lg:text-5xl font-bold text-(--primary-color) mb-4">Cenovnik</h2>
      <p className="text-center text-sm text-(--secondary-color) mb-12">Transparentne cene za vrhunsku uslugu.</p>
      <div className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 px-4">
        {featured.map((srv, idx) => {
          const dark = srv.featured === "main";
          return (
            <div key={srv._id} className={classNames(dark ? "bg-gray-900 text-gray-100 ring-1 ring-gray-700 shadow-2xl" : "bg-white ring-1 ring-gray-200", "rounded-3xl p-7")}>
              <h3 className={classNames(dark ? "text-(--secondary-color)" : "text-(--primary-color)", "font-semibold text-base mb-1")}>{srv.name}</h3>
              <p className={classNames(dark ? "text-gray-400" : "text-gray-500", "text-xs")}>{srv.category}{srv.subcategory ? ` · ${srv.subcategory}` : ""}</p>
              {srv.type !== "variant" && (
                <p className="mt-4 flex items-baseline gap-2">
                  <span className={classNames(dark ? "text-white" : "text-gray-900", "text-4xl font-bold")}>{formatPriceToString(srv.basePrice)}</span>
                  <span className={classNames(dark ? "text-gray-400" : "text-gray-500", "text-sm")}>/terminu</span>
                </p>
              )}
              {srv.type === "variant" && srv.variants && (
                <ul className="mt-4 space-y-2 text-sm">
                  {srv.variants.map((v, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{v.name}</span><span className="font-semibold">{formatPriceToString(v.price)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {srv.description && <p className={classNames(dark ? "text-gray-300" : "text-gray-500", "mt-4 text-xs leading-relaxed")}>{srv.description}</p>}
              {(srv.items?.length ?? 0) > 0 && (
                <ul className="mt-6 space-y-2 text-sm">
                  {srv.items.map(item => (
                    <li key={item} className="flex gap-2">
                      <CheckIcon className={classNames(dark ? "text-indigo-400" : "text-(--secondary-color)", "h-5 w-4 flex-none")} />{item}
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/termini" className={classNames(dark ? "bg-(--secondary-color) text-white hover:bg-(--secondary-color)/80" : "border border-(--secondary-color) text-(--secondary-color) hover:bg-(--secondary-color) hover:text-white", "mt-6 block rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition")}>
                Zakaži
              </Link>
            </div>
          );
        })}
      </div>
      <p className="text-center mt-8">
        <Link href="/usluge" className="text-sm text-(--secondary-color) font-semibold hover:underline">Pogledaj sve usluge →</Link>
      </p>
    </section>
  );
}
