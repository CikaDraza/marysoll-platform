import { IService } from "@/types";
import { formatPriceToString } from "@/helpers/formatPrice";
import Image from "next/image";
import Link from "next/link";

interface Props {
  services: IService[];
  headline?: string;
  subheadline?: string;
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

export function Theme4ServicesSoft({
  services,
  headline,
  subheadline,
  tenantSlug,
}: Props) {
  const grouped = services.reduce<Record<string, IService[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <section className="bg-[#2b1e26] text-white py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <Image
            width={600}
            height={500}
            alt="Service image"
            src="https://res.cloudinary.com/dufo1t5li/image/upload/v1771541591/salon/zycqbewvuphkygo2hr8w.jpg"
            className="rounded-[40px] object-cover"
          />

          <div>
            <p className="italic mb-2 text-xs text-[#E8D4AD]">{subheadline}</p>
            <h2 className="text-4xl mb-8">{headline}</h2>
            {/* GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
              {services?.slice(0, 6).map((s) => {
                const mp = minPrice(s);
                return (
                  <div
                    key={s._id}
                    className="p-6 bg-[#E8D4AD] hover:bg-[var(--secondary-color)]/40 transition"
                  >
                    <p className="text-[10px] uppercase tracking-widest text-[#2b1e26]/60 mb-1">
                      {s.category}
                    </p>
                    <h3 className="text-base mb-1 text-[#2b1e26] font-medium">
                      {s.name}
                    </h3>
                    {s.description && (
                      <p className="text-xs text-[#2b1e26]/70">
                        {s.description}
                      </p>
                    )}
                    {mp != null && (
                      <p className="mt-3 text-sm font-semibold text-[#2b1e26]">
                        {s.type !== "single" ? "od " : ""}
                        {formatPriceToString(mp)} RSD
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-12">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <p className="text-xs uppercase tracking-widest text-[#E8D4AD] mb-3 border-b border-[#E8D4AD]/20 pb-2">
                {category}
              </p>

              <ul className="space-y-4">
                {items.map((s) => {
                  const mp = minPrice(s);
                  return (
                    <li key={s._id}>
                      <div className="flex justify-between items-baseline">
                        <span className="font-medium">{s.name}</span>
                        {mp != null && (
                          <span className="text-[#E8D4AD] text-sm">
                            {s.type !== "single" ? "od " : ""}
                            {formatPriceToString(mp)} RSD
                          </span>
                        )}
                      </div>

                      {/* Variants */}
                      {s.type === "variant" &&
                        (s.variants ?? []).length > 0 && (
                          <ul className="mt-1 space-y-0.5 pl-3 border-l border-[#E8D4AD]/20">
                            {s.variants!.map((v, i) => (
                              <li
                                key={i}
                                className="flex justify-between text-xs text-[#E8D4AD]/70"
                              >
                                <span>{v.name}</span>
                                <span>{formatPriceToString(v.price)} RSD</span>
                              </li>
                            ))}
                          </ul>
                        )}

                      {/* Group sub-services */}
                      {s.type === "group" && (s.services ?? []).length > 0 && (
                        <ul className="mt-1 space-y-0.5 pl-3 border-l border-[#E8D4AD]/20">
                          {s.services!.map((sv, i) => (
                            <li
                              key={i}
                              className="flex justify-between text-xs text-[#E8D4AD]/70"
                            >
                              <span>{sv.name}</span>
                              {sv.price != null && (
                                <span>{formatPriceToString(sv.price)} RSD</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Extras */}
                      {(s.extras ?? []).length > 0 && (
                        <ul className="mt-1 space-y-0.5 pl-3 border-l border-[#E8D4AD]/10">
                          {s.extras!.map((e, i) => (
                            <li
                              key={i}
                              className="flex justify-between text-xs text-[#E8D4AD]/50"
                            >
                              <span>+ {e.name}</span>
                              <span>{formatPriceToString(e.price)} RSD</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <Link
          href={`/${tenantSlug}/termini`}
          className="mt-8 border px-5 py-2 inline-block hover:bg-[#E8D4AD] hover:text-black transition border-[#E8D4AD]"
        >
          Zakaži termin
        </Link>
      </div>
    </section>
  );
}
