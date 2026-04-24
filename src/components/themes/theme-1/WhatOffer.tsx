import type { IService } from "@/types";
import Image from "next/image";
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
        <p className="text-sm pb-2 font-semibold text-(--primary-color) tracking-widest text-center mb-2">
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
                      <p className="text-black/80 text-xs line-clamp-6">
                        {s.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="col-span-2 lg:col-span-1 bg-gray-50 px-6 py-3">
              <Link
                href={servicesHref}
                className="block w-full h-full font-semibold text-sm text-black group transition"
              >
                <div className="group relative">
                  <div className="mt-4 flex justify-between">
                    <div className="flex flex-col justify-center items-center gap-1 w-full h-full">
                      <h3 className="text-md text-center font-bold text-gray-900">
                        Tretmani koje vam daju sjaj
                      </h3>
                      <p className="text-xs text-center text-gray-500">
                        Pogledaj detaljnije sve naše tretmane
                      </p>
                      <button className="rounded cursor-pointer mt-8 text-sm text-gray-100 bg-(--primary-color) hover:bg-(--primary-color)/90 px-6 py-2">
                        tretmani
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
