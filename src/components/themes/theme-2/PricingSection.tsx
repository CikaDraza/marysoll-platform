"use client";
import Link from "next/link";
import { formatPriceToString } from "@/helpers/formatPrice";
import type { IService } from "@/types";

interface Props {
  services: IService[];
}

export function Theme2PricingSection({ services }: Props) {
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
        <div className="w-12 h-0.5 bg-yellow-500 mx-auto mb-4" />
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
                className={`rounded-2xl p-7 border ${gold ? "bg-yellow-500" : "bg-gray-950 border-gray-950 hover:border-yellow-500/20 transition"}`}
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
                {srv.type !== "variant" && (
                  <p className="mb-4">
                    <span
                      className={`text-4xl font-black ${gold ? "text-gray-950" : "text-white"}`}
                    >
                      {formatPriceToString(srv.basePrice)}
                    </span>
                    <span className="text-gray-600 text-sm ml-1">/terminu</span>
                  </p>
                )}
                {srv.type === "variant" &&
                  srv.variants?.map((v, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center gap-x-4 text-sm mb-1"
                    >
                      <span
                        className={`${gold ? "text-gray-950" : "text-white"}`}
                      >
                        {v.name}
                      </span>
                      <hr
                        className={`flex-1 border-dashed ${gold ? "border-gray-900" : "border-gray-600"}`}
                      />
                      <span
                        className={`${gold ? "text-gray-950" : "text-white"} font-bold`}
                      >
                        {formatPriceToString(v.price)}
                      </span>
                    </div>
                  ))}
                {srv.description && (
                  <p className="text-gray-800 text-xs mt-3 leading-relaxed">
                    {srv.description}
                  </p>
                )}
                <Link
                  href="/termini"
                  className={`mt-6 block text-center py-2.5 rounded-lg text-sm font-bold transition border border-black ${gold ? "bg-transparent text-gray-950 hover:bg-black hover:text-white" : "border border-yellow-500/30 text-yellow-400 hover:border-yellow-500"}`}
                >
                  Zakaži
                </Link>
              </div>
            );
          })}
        </div>
        <p className="text-center mt-8">
          <Link
            href="/usluge"
            className="text-sm text-yellow-500 hover:text-yellow-400 font-semibold"
          >
            Pogledaj sve usluge →
          </Link>
        </p>
      </div>
    </section>
  );
}
