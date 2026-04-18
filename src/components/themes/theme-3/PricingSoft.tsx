"use client";

import Link from "next/link";
import type { IService } from "@/types";

interface Props {
  services: IService[];
  headline?: string;
  tenantSlug?: string;
}

export function Theme3PricingSoft({ services, headline, tenantSlug }: Props) {
  if (!services.length) return null;

  const resolveHref = (href: string) => {
    const prefix = tenantSlug ? `/${tenantSlug}` : "";
    return `${prefix}${href}`;
  };

  return (
    <section className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        {/* Title */}
        <h2 className="text-4xl text-center font-semibold text-[#2d2d2d] mb-16">
          {headline || "Usluge i cene"}
        </h2>

        <div className="space-y-6">
          {services.map((service) => (
            <div
              key={service._id}
              className="flex items-center justify-between border-b border-[#eeeae4] pb-4"
            >
              <div>
                <p className="text-lg font-medium text-[#2d2d2d]">
                  {service.name}
                </p>
                {service.description && (
                  <p className="text-sm text-[#8a8a8a]">
                    {service.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-6">
                <span className="text-lg font-semibold text-[#bfa37a]">
                  {service.price} RSD
                </span>

                <Link
                  href={resolveHref("/termini")}
                  className="text-sm text-[#2d2d2d] border border-[#e5e2dc] px-4 py-2 rounded-full hover:bg-[#f3eee8] transition"
                >
                  Zakaži
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* CTA bottom */}
        <div className="text-center mt-16">
          <Link
            href={resolveHref("/termini")}
            className="px-10 py-4 bg-[#2d2d2d] text-white rounded-full text-sm tracking-wide hover:bg-black transition"
          >
            Pogledaj slobodne termine
          </Link>
        </div>
      </div>
    </section>
  );
}
