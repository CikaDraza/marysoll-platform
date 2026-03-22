"use client";
import Link from "next/link";
import { CheckIcon } from "@heroicons/react/20/solid";
import { formatPriceToString } from "@/helpers/formatPrice";
import type { IService } from "@/types";

interface Props { services: IService[] }

export function Theme3PricingSection({ services }: Props) {
  const featured = [...services]
    .filter(s => s.featured && s.featured !== "none")
    .sort((a, b) => {
      const order: Record<string, number> = { second: 0, main: 1, third: 2 };
      return (order[a.featured ?? "none"] ?? 9) - (order[b.featured ?? "none"] ?? 9);
    });
  if (!featured.length) return null;

  return (
    <section className="bg-[#FAF8F5] py-20 lg:py-28 px-6">
      <div className="max-w-5xl mx-auto">
        <p className="text-[#C9A990] text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3">cenovnik</p>
        <h2 className="text-3xl font-light text-[#3D2B1F] text-center mb-16">Transparentne cene</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featured.map(srv => {
            const highlight = srv.featured === "main";
            return (
              <div key={srv._id} className={`rounded-3xl p-7 border transition ${highlight ? "bg-[#C9A990] border-[#C9A990] shadow-xl shadow-[#C9A990]/20" : "bg-white border-[#EDE5DC] hover:border-[#C9A990]"}`}>
                <h3 className={`font-medium text-base mb-1 ${highlight ? "text-white" : "text-[#5C4033]"}`}>{srv.name}</h3>
                <p className={`text-xs mb-5 ${highlight ? "text-white/70" : "text-[#9E7E6E]"}`}>{srv.category}</p>
                {srv.type !== "variant" && (
                  <p className={`text-4xl font-light mb-1 ${highlight ? "text-white" : "text-[#3D2B1F]"}`}>
                    {formatPriceToString(srv.basePrice)}
                    <span className={`text-sm ${highlight ? "text-white/70" : "text-[#9E7E6E]"}`}> /terminu</span>
                  </p>
                )}
                {srv.type === "variant" && srv.variants?.map((v, i) => (
                  <div key={i} className={`flex justify-between text-sm mb-1 ${highlight ? "text-white" : "text-[#7C6A5E]"}`}>
                    <span>{v.name}</span><span className="font-medium">{formatPriceToString(v.price)}</span>
                  </div>
                ))}
                {srv.description && <p className={`text-xs mt-3 leading-relaxed ${highlight ? "text-white/80" : "text-[#9E7E6E]"}`}>{srv.description}</p>}
                {(srv.items?.length ?? 0) > 0 && (
                  <ul className="mt-4 space-y-2">
                    {srv.items.map(item => (
                      <li key={item} className={`flex gap-2 text-xs ${highlight ? "text-white" : "text-[#7C6A5E]"}`}>
                        <CheckIcon className={`h-4 w-4 flex-shrink-0 ${highlight ? "text-white" : "text-[#C9A990]"}`} />{item}
                      </li>
                    ))}
                  </ul>
                )}
                <Link href="/termini" className={`mt-6 block text-center py-2.5 rounded-full text-sm font-medium transition ${highlight ? "bg-white text-[#C9A990] hover:bg-gray-50" : "bg-[#C9A990] text-white hover:bg-[#B8957A]"}`}>
                  Zakaži
                </Link>
              </div>
            );
          })}
        </div>
        <p className="text-center mt-8">
          <Link href="/usluge" className="text-sm text-[#C9A990] font-medium hover:underline">Pogledaj sve usluge →</Link>
        </p>
      </div>
    </section>
  );
}
