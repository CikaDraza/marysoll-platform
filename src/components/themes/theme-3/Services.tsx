import { IService } from "@/types";
import { formatPriceToString } from "@/helpers/formatPrice";

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

export function Theme3ServicesSoft({ services, headline, subheadline }: Props) {
  const grouped = services.reduce<Record<string, IService[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <section className="bg-[#FAF8F5] py-24">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-4xl font-serif text-[#2B2B2B] mb-3">
          {headline || "Usluge"}
        </h2>
        {subheadline && (
          <p className="text-sm text-[#6B6B6B] mb-12">{subheadline}</p>
        )}

        <div className="space-y-12">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold tracking-widest uppercase text-[#C9A990] mb-5 border-b border-[#E5E0DA] pb-2">
                {category}
              </h3>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map((s) => {
                  const mp = minPrice(s);
                  return (
                    <div
                      key={s._id}
                      className="bg-white rounded-2xl p-5 border border-[#E5E0DA] flex flex-col gap-3"
                    >
                      <div>
                        <p className="text-base font-semibold text-[#2B2B2B]">
                          {s.name}
                        </p>
                        {s.subcategory && (
                          <p className="text-xs text-[#9E7E6E] mt-0.5">
                            {s.subcategory}
                          </p>
                        )}
                        {s.description && (
                          <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed">
                            {s.description}
                          </p>
                        )}
                      </div>

                      {/* Variants */}
                      {s.type === "variant" &&
                        (s.variants ?? []).length > 0 && (
                          <ul className="space-y-1">
                            {s.variants!.map((v, i) => (
                              <li
                                key={i}
                                className="flex justify-between items-center text-xs text-[#5C4033]"
                              >
                                <span>{v.name}</span>
                                <span className="font-medium">
                                  {formatPriceToString(v.price)} RSD
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}

                      {/* Group sub-services */}
                      {s.type === "group" && (s.services ?? []).length > 0 && (
                        <ul className="space-y-1">
                          {s.services!.map((sv, i) => (
                            <li
                              key={i}
                              className="flex justify-between items-center text-xs text-[#5C4033]"
                            >
                              <span>{sv.name}</span>
                              {sv.price != null && (
                                <span className="font-medium">
                                  {formatPriceToString(sv.price)} RSD
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Extras */}
                      {(s.extras ?? []).length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9E7E6E] mb-1">
                            Dodaci
                          </p>
                          <ul className="space-y-1">
                            {s.extras!.map((e, i) => (
                              <li
                                key={i}
                                className="flex justify-between items-center text-xs text-[#7C6A5E]"
                              >
                                <span>+ {e.name}</span>
                                <span>{formatPriceToString(e.price)} RSD</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {mp != null && (
                        <p className="mt-auto text-sm font-semibold text-[#E7B8A4]">
                          {s.type !== "single" ? "od " : ""}
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
