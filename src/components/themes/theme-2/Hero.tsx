import Link from "next/link";
import type { SalonProfileData } from "@/types";

interface Props { salon: SalonProfileData }

export function Theme2Hero({ salon }: Props) {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gray-950 text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(234,179,8,0.08),_transparent_60%)]" />
      <div className="relative z-10 text-center max-w-4xl mx-auto px-6 py-32">
        <p className="text-yellow-400 text-xs font-bold tracking-[0.3em] uppercase mb-6">Premium Beauty Salon</p>
        <h1 className="text-5xl lg:text-7xl font-black tracking-tight text-white mb-6 leading-none">{salon.name}</h1>
        {salon.description && <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-12 leading-relaxed">{salon.description}</p>}
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/termini" className="px-10 py-4 bg-yellow-500 text-gray-950 font-black text-sm tracking-wider rounded hover:bg-yellow-400 transition shadow-2xl shadow-yellow-500/20">
            ZAKAŽI TERMIN
          </Link>
          <Link href="/usluge" className="px-10 py-4 border border-yellow-500/40 text-yellow-400 font-semibold text-sm tracking-wider rounded hover:border-yellow-400 hover:text-white transition">
            CENOVNIK
          </Link>
        </div>
        {(salon.phone || salon.city) && (
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-gray-600 text-sm border-t border-gray-800 pt-8">
            {salon.phone && <span>📞 {salon.phone}</span>}
            {salon.city && <span>📍 {[salon.street, salon.city].filter(Boolean).join(", ")}</span>}
          </div>
        )}
      </div>
    </section>
  );
}
