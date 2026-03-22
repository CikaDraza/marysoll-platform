import type { IService } from "@/types";

interface Props { services: IService[] }

export function Theme1WhatOffer({ services }: Props) {
  const categories = Array.from(new Set(services.map(s => s.category)));
  const colors = ["bg-purple-500", "bg-pink-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-indigo-500"];
  
  return (
    <section className="py-16 lg:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <p className="text-sm font-semibold text-(--secondary-color) tracking-widest text-center mb-2">šta nudimo</p>
        <h2 className="text-3xl lg:text-5xl font-bold text-(--primary-color) text-center mb-16">Usluge za vašu lepotu</h2>
        <div className="space-y-12">
          {categories.map(cat => {
            const catServices = services.filter(s => s.category === cat);
            return (
              <div key={cat}>
                <h3 className="text-xl font-bold text-(--primary-color) mb-6">{cat}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {catServices.map((s, i) => (
                    <div key={s._id} className={`${colors[i % colors.length]} rounded-2xl p-5 text-white`}>
                      <h4 className="font-bold text-sm mb-1">{s.name}</h4>
                      {s.description && <p className="text-white/80 text-xs line-clamp-2">{s.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
