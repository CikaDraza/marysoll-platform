import { IService } from "@/types";
import { formatPriceToString } from "@/helpers/formatPrice";

interface Props {
  services: IService[];
  headline?: string;
  subheadline?: string;
  tenantSlug?: string;
}

function minPrice(s: IService): number | null {
  if (s.type === "variant") {
    const p = (s.variants ?? [])
      .map((v) => v.price)
      .filter((x): x is number => x != null);
    return p.length ? Math.min(...p) : (s.basePrice ?? null);
  }
  if (s.type === "group") {
    const p = (s.services ?? [])
      .map((sv) => sv.price)
      .filter((x): x is number => x != null);
    return p.length ? Math.min(...p) : (s.basePrice ?? null);
  }
  return s.basePrice ?? null;
}

export function Theme3ServicesSoft({ services, headline, subheadline }: Props) {
  const grouped = services.reduce<Record<string, IService[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <section id="services" className="bg-[#FAF8F5] py-24">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-serif text-[#2B2B2B] mb-3">
          {headline || "Usluge"}
        </h2>
        {subheadline && (
          <p className="text-sm text-[#6B6B6B] mb-12">{subheadline}</p>
        )}

        <div className="space-y-12">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold tracking-widest uppercase text-(--primary-color) mb-5 border-b border-[#E5E0DA] pb-2">
                {category}
              </h3>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map((s) => {
                  const mp = minPrice(s);
                  return (
                    <div
                      key={s._id}
                      className="bg-white rounded-2xl p-5 border border-[#E5E0DA] flex flex-col gap-2"
                    >
                      <p className="text-base font-semibold text-[#2B2B2B]">
                        {s.name}
                      </p>
                      <p className="text-xs text-(--primary-color)">
                        {s.category}
                      </p>
                      {mp != null && (
                        <p className="mt-auto text-sm font-semibold text-(--primary-color)">
                          {s.type === "variant" ? "od " : ""}
                          {formatPriceToString(mp)} RSD
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
