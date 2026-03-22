"use client";
import Link from "next/link";
import { formatPriceToString } from "@/helpers/formatPrice";
import type { IService } from "@/types";

interface Props { services: IService[] }

export function Theme2PricingSection({ services }: Props) {
  const featured = [...services]
    .filter(s => s.featured && s.featured !== "none")
    .sort((a, b) => {
      const o: Record<string, number> = { second: 0, main: 1, third: 2 };
      return (o[a.featured ?? "none"] ?? 9) - (o[b.featured ?? "none"] ?? 9);
    });
  if (!featured.length) return null;

  return (
    <section className="bg-gray-900 py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="w-12 h-0.5 bg-yellow-500 mx-auto mb-4" />
        <h2 className="text-3xl font-black text-white text-center mb-4">Cenovnik</h2>
        <p className="text-gray-600 text-center text-sm mb-16">Premium tretmani po transparentnim cenama</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featured.map(srv => {
            const gold = srv.featured === "main";
            return (
              <div key={srv._id} className={`rounded-2xl p-7 border ${gold ? "bg-yellow-500/10 border-yellow-500/40" : "bg-gray-800 border-gray-700 hover:border-yellow-500/20 transition"}`}>
                <h3 className={`font-bold text-base mb-1 ${gold ? "text-yellow-400" : "text-white"}`}>{srv.name}</h3>
                <p className="text-gray-600 text-xs mb-5">{srv.category}</p>
                {srv.type !== "variant" && (
                  <p className="mb-4">
                    <span className={`text-4xl font-black ${gold ? "text-yellow-400" : "text-white"}`}>{formatPriceToString(srv.basePrice)}</span>
                    <span className="text-gray-600 text-sm ml-1">/terminu</span>
                  </p>
                )}
                {srv.type === "variant" && srv.variants?.map((v, i) => (
                  <div key={i} className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">{v.name}</span>
                    <span className="text-yellow-400 font-bold">{formatPriceToString(v.price)}</span>
                  </div>
                ))}
                {srv.description && <p className="text-gray-600 text-xs mt-3 leading-relaxed">{srv.description}</p>}
                <Link href="/termini" className={`mt-6 block text-center py-2.5 rounded-lg text-sm font-bold transition ${gold ? "bg-yellow-500 text-gray-950 hover:bg-yellow-400" : "border border-yellow-500/30 text-yellow-400 hover:border-yellow-500"}`}>
                  Zakaži
                </Link>
              </div>
            );
          })}
        </div>
        <p className="text-center mt-8">
          <Link href="/usluge" className="text-sm text-yellow-500 hover:text-yellow-400 font-semibold">Pogledaj sve usluge →</Link>
        </p>
      </div>
    </section>
  );
}
