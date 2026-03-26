import Link from "next/link";
import type { SalonProfileData } from "@/types";

interface Props {
  salon: SalonProfileData;
}

export function Theme3Hero({ salon }: Props) {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center bg-[#FAF8F5] pt-24 overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-[#F5EEE8] rounded-l-[120px] -z-0 hidden lg:block" />
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-[#C9A990] text-xs font-semibold tracking-[0.25em] uppercase mb-5">
            Beauty & Wellness
          </p>
          <h1 className="text-5xl lg:text-6xl font-light text-[#3D2B1F] leading-tight mb-6">
            {salon.name.split(" ").map((word, i) =>
              i % 2 === 0 ? (
                <span key={i}>{word} </span>
              ) : (
                <em
                  key={i}
                  className="font-serif italic text-[#C9A990] not-italic"
                >
                  {word}{" "}
                </em>
              ),
            )}
          </h1>
          {salon.description && (
            <p className="text-[#9E7E6E] text-base leading-relaxed mb-10 max-w-md">
              {salon.description}
            </p>
          )}
          <div className="flex flex-wrap gap-4">
            <Link
              href="/termini"
              className="px-8 py-3.5 bg-[#C9A990] text-white text-sm font-medium rounded-full hover:bg-[#B8957A] transition shadow-lg shadow-[#C9A990]/20"
            >
              Zakaži termin
            </Link>
            <Link
              href="/usluge"
              className="px-8 py-3.5 border border-[#D9C9BC] text-[#7C6A5E] text-sm font-medium rounded-full hover:border-[#C9A990] hover:text-[#5C4033] transition"
            >
              Naše usluge
            </Link>
          </div>
          {(salon.phone || salon.city) && (
            <div className="flex flex-wrap gap-6 mt-12 text-xs text-[#9E7E6E]">
              {salon.phone && <span>📞 {salon.phone}</span>}
              {(salon.street || salon.city) && (
                <span>
                  📍 {[salon.street, salon.city].filter(Boolean).join(", ")}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="hidden lg:flex justify-center">
          <div className="w-80 h-96 bg-[#EDE5DC] rounded-[60px] flex items-center justify-center">
            <div className="text-center">
              <p className="text-6xl mb-4">💆‍♀️</p>
              <p className="text-[#9E7E6E] text-sm font-light">
                Premium Beauty
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
