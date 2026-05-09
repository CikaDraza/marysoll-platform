import type { IService } from "@/types";

interface Props {
  services: IService[];
  headline?: string;
  subheadline?: string;
  tenantSlug?: string;
}

interface SubcategoryGroup {
  name: string | null;
  services: IService[];
}

interface CategoryGroup {
  category: string;
  subcategories: SubcategoryGroup[];
}

function groupServices(services: IService[]): CategoryGroup[] {
  const catMap = new Map<string, Map<string, IService[]>>();

  for (const s of services) {
    if (!catMap.has(s.category)) catMap.set(s.category, new Map());
    const subKey = s.subcategory || "__none__";
    const subMap = catMap.get(s.category)!;
    if (!subMap.has(subKey)) subMap.set(subKey, []);
    subMap.get(subKey)!.push(s);
  }

  return Array.from(catMap.entries()).map(([category, subMap]) => ({
    category,
    subcategories: Array.from(subMap.entries()).map(([subKey, svcs]) => ({
      name: subKey === "__none__" ? null : subKey,
      services: svcs,
    })),
  }));
}

function resolvePrice(s: IService): string {
  if (s.type === "variant" && s.variants && s.variants.length > 0) {
    const prices = s.variants.map((v) => v.price);
    const min = Math.min(...prices);
    return `od ${min} RSD`;
  }
  if (s.type === "group" && s.services && s.services.length > 0) {
    const prices = s.services.map((g) => g.price).filter(Boolean);
    if (prices.length > 0) return `od ${Math.min(...prices)} RSD`;
  }
  if (s.price) return `${s.price} RSD`;
  if (s.basePrice) return `od ${s.basePrice} RSD`;
  return "";
}

const PASTEL = [
  "bg-[#F5EEE8]",
  "bg-[#EDE5DC]",
  "bg-[#E8EDE8]",
  "bg-[#EDE8ED]",
  "bg-[#F0EDE5]",
  "bg-[#E5EDE8]",
];

export function Theme3WhatOffer({
  services,
  headline,
  subheadline,
  tenantSlug,
}: Props) {
  const grouped = groupServices(services);

  return (
    <section className="bg-[#FAF8F5] py-20 lg:py-28 px-6">
      <div className="max-w-7xl mx-auto">
        <p className="text-[#C9A990] text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3">
          šta nudimo
        </p>
        <h2 className="text-3xl lg:text-4xl font-light text-[#3D2B1F] text-center mb-4">
          {headline || (
            <>
              Usluge za vašu{" "}
              <em className="not-italic text-[#C9A990]">lepotu</em>
            </>
          )}
        </h2>
        {subheadline && (
          <p className="text-[#9E7E6E] text-center max-w-xl mx-auto mb-4">
            {subheadline}
          </p>
        )}

        <div className="space-y-14 mt-12">
          {grouped.map(({ category, subcategories }) => (
            <div key={category}>
              <h3 className="text-[#7C6A5E] text-xs font-semibold tracking-widest uppercase mb-6 border-b border-[#E8E0D5] pb-2">
                {category}
              </h3>

              <div className="space-y-8">
                {subcategories.map(
                  ({ name: subName, services: subServices }, subIdx) => (
                    <div key={subName ?? subIdx}>
                      {subName && (
                        <h4 className="text-[#A07060] text-[11px] font-semibold tracking-widest uppercase mb-4 ml-0.5">
                          {subName}
                        </h4>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {subServices.map((s, i) => {
                          const price = resolvePrice(s);
                          const bgClass =
                            PASTEL[(i + subIdx * 2) % PASTEL.length];

                          return (
                            <div
                              key={s._id}
                              className={`${bgClass} rounded-2xl p-5 hover:shadow-sm transition-shadow`}
                            >
                              <h5 className="text-[#5C4033] text-sm font-medium mb-1 leading-snug">
                                {s.name}
                              </h5>

                              {s.description && (
                                <p className="text-[#9E7E6E] text-xs line-clamp-2 leading-relaxed mb-2">
                                  {s.description}
                                </p>
                              )}

                              {s.type === "variant" &&
                                s.variants &&
                                s.variants.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {s.variants.slice(0, 3).map((v, vi) => (
                                      <span
                                        key={vi}
                                        className="text-[10px] bg-white/70 text-[#7C6A5E] rounded-full px-2 py-0.5 leading-none"
                                      >
                                        {v.name}
                                      </span>
                                    ))}
                                    {s.variants.length > 3 && (
                                      <span className="text-[10px] text-[#9E7E6E]">
                                        +{s.variants.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}

                              {s.type === "group" &&
                                s.services &&
                                s.services.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {s.services.slice(0, 3).map((g, gi) => (
                                      <span
                                        key={gi}
                                        className="text-[10px] bg-white/70 text-[#7C6A5E] rounded-full px-2 py-0.5 leading-none"
                                      >
                                        {g.name}
                                      </span>
                                    ))}
                                    {s.services.length > 3 && (
                                      <span className="text-[10px] text-[#9E7E6E]">
                                        +{s.services.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}

                              {price && (
                                <span className="text-[#C9A990] text-xs font-semibold">
                                  {price}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <a
            href={tenantSlug ? `/${tenantSlug}/usluge` : "/usluge"}
            className="inline-flex items-center gap-2 text-sm text-[#C9A990] hover:text-[#b8947a] transition-colors font-medium"
          >
            Pogledaj sve usluge
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
