import type { IService } from "@/types";
import Link from "next/link";

interface Props {
  services: IService[];
  headline?: string;
  subheadline?: string;
  tenantSlug?: string;
}

export function Theme1WhatOffer({
  services,
  headline,
  subheadline,
  tenantSlug,
}: Props) {
  const servicesHref = tenantSlug ? `/${tenantSlug}/usluge` : "/usluge";
  return (
    <section className="py-40 lg:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <p className="text-sm pb-2 font-semibold text-(--secondary-color) tracking-widest text-center mb-2">
          {subheadline || "šta nudimo"}
        </p>
        <h2 className="text-5xl lg:text-6xl font-bold text-black text-center mb-16">
          {headline || "Usluge za vašu lepotu"}
        </h2>
        <div className="space-y-12">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {services.map((s) => {
              return (
                <div key={s._id}>
                  <div className={`col-span-1 rounded-2xl p-5 text-black`}>
                    <h3 className="font-bold text-md mb-1">{s.name}</h3>
                    {s.description && (
                      <p className="text-black/80 text-xs line-clamp-2">
                        {s.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="m-auto">
              <Link
                href={servicesHref}
                className="px-7 py-3 border border-black hover:border-(--secondary-color) text-black font-semibold rounded-full hover:bg-(--secondary-color) hover:text-white transition text-sm"
              >
                Naše usluge
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
