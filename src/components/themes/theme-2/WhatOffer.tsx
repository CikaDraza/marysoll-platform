import type { IService } from "@/types";

interface Props {
  services: IService[];
}

export function Theme2WhatOffer({ services }: Props) {
  const categories = Array.from(new Set(services.map((s) => s.category)));
  return (
    <section className="bg-gray-950 py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="w-12 h-0.5 bg-(--primary-color) mx-auto mb-4" />
        <h2 className="text-3xl lg:text-5xl font-black text-white text-center mb-4">
          Naše usluge
        </h2>
        <p className="text-gray-600 text-center text-sm mb-16">
          Otkrijte tretmane prilagođene vašim potrebama
        </p>
        <div className="space-y-10">
          {categories.map((cat) => (
            <div key={cat}>
              <h3 className="text-yellow-400 text-xs font-black tracking-[0.3em] uppercase mb-5">
                {cat}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {services
                  .filter((s) => s.category === cat)
                  .map((s) => (
                    <div
                      key={s._id}
                      className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-(--primary-color) transition group cursor-pointer"
                    >
                      <h4 className="text-white text-sm font-semibold mb-1 group-hover:text-(--primary-color) transition">
                        {s.name}
                      </h4>
                      {s.description && (
                        <p className="text-gray-600 text-xs line-clamp-2 leading-relaxed">
                          {s.description}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
