import Link from "next/link";
import { IService } from "@/types";
import { formatPriceToString } from "@/helpers/formatPrice";
import FlowerIcon from "@/components/assets/icons/services/FlowerIcon";

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

export function Theme5Pricing({
  services,
  tenantSlug,
}: {
  services: IService[];
  tenantSlug?: string;
}) {
  const p = tenantSlug ? `/${tenantSlug}` : "";

  const grouped = services.reduce<Record<string, IService[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto text-center mb-24">
        <span className="text-xs text-gray-500">naše ponude</span>
        <h2 className="text-2xl font-light uppercase text-gray-800 mb-10">
          <span className="text-gray-900">specijalni paketi</span> cena
        </h2>
        <div className="flex items-center justify-between w-48 mx-auto">
          <div className="border border-gray-100 w-24"></div>
          <div className="p-2">
            <FlowerIcon bgColor="#FFB633" />
          </div>
          <div className="border border-gray-100 w-24"></div>
        </div>
      </div>
      <div className="max-w-7xl grid grid-cols-1 gap-8 mx-auto px-6">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="h-auto">
            <h3 className="text-sm font-bold tracking-widest uppercase text-[#FFB633] mb-5 border-b border-gray-200 pb-2">
              {category}
            </h3>

            <div className="h-auto grid grid-cols-1 md:grid-cols-3 gap-6">
              {items.map((s) => {
                const mp = minPrice(s);
                return (
                  <div
                    key={s._id}
                    className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex flex-col gap-3 h-full"
                  >
                    <div>
                      <p className="text-base font-semibold text-gray-800">
                        {s.name}
                      </p>
                      {s.subcategory && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {s.subcategory}
                        </p>
                      )}
                      {s.description && (
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                          {s.description}
                        </p>
                      )}
                    </div>

                    {s.type === "variant" && (s.variants ?? []).length > 0 && (
                      <ul className="space-y-1">
                        {s.variants!.map((v, i) => (
                          <li
                            key={i}
                            className="flex justify-between items-center text-xs text-gray-600"
                          >
                            <span>{v.name}</span>
                            <span className="font-medium">
                              {formatPriceToString(v.price)} RSD
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {s.type === "group" && (s.services ?? []).length > 0 && (
                      <ul className="space-y-1">
                        {s.services!.map((sv, i) => (
                          <li
                            key={i}
                            className="flex justify-between items-center text-xs text-gray-600"
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

                    {(s.extras ?? []).length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                          Dodaci
                        </p>
                        <ul className="space-y-1">
                          {s.extras!.map((e, i) => (
                            <li
                              key={i}
                              className="flex justify-between items-center text-xs text-gray-500"
                            >
                              <span>+ {e.name}</span>
                              <span>{formatPriceToString(e.price)} RSD</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-auto flex items-center justify-between">
                      {mp != null && (
                        <p className="text-sm font-semibold text-[#FFB633]">
                          {s.type !== "single" ? "od " : ""}
                          {formatPriceToString(mp)} RSD
                        </p>
                      )}
                      <Link
                        href={`${p}/termini`}
                        className="ml-auto text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full border border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white transition-colors"
                      >
                        Zakaži
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
