import type { IService } from "@/types";

interface Props { services: IService[] }

export function Theme3WhatOffer({ services }: Props) {
  const categories = Array.from(new Set(services.map(s => s.category)));
  const pastelBg = ["bg-[#F5EEE8]", "bg-[#EDE5DC]", "bg-[#E8EDE8]", "bg-[#EDE8ED]", "bg-[#F0EDE5]", "bg-[#E5EDE8]"];

  return (
    <section className="bg-[#FAF8F5] py-20 lg:py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <p className="text-[#C9A990] text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3">šta nudimo</p>
        <h2 className="text-3xl lg:text-4xl font-light text-[#3D2B1F] text-center mb-16">
          Usluge za vašu <em className="italic not-italic text-[#C9A990]">lepotu</em>
        </h2>
        <div className="space-y-12">
          {categories.map(cat => (
            <div key={cat}>
              <h3 className="text-[#7C6A5E] text-xs font-semibold tracking-widest uppercase mb-6 border-b border-[#E8E0D5] pb-2">{cat}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {services.filter(s => s.category === cat).map((s, i) => (
                  <div key={s._id} className={`${pastelBg[i % pastelBg.length]} rounded-2xl p-5 hover:shadow-sm transition`}>
                    <h4 className="text-[#5C4033] text-sm font-medium mb-1">{s.name}</h4>
                    {s.description && <p className="text-[#9E7E6E] text-xs line-clamp-2 leading-relaxed">{s.description}</p>}
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
