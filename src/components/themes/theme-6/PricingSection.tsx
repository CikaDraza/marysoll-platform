import type { IService } from "@/types";
import { formatServicePrice } from "@/helpers/formatPrice";

interface Props {
  headline?: string;
  subheadline?: string;
  services: IService[];
  tenantSlug?: string;
}

export function Theme6PricingSection({
  headline = "Pricing",
  subheadline = "Transparent pricing for exceptional service",
  services,
  tenantSlug,
}: Props) {
  const base = tenantSlug ? `/${tenantSlug}` : "";

  let manicureItems = services.filter((s) => s.name.toLowerCase().includes("manicure")).slice(0, 4);
  let pedicureItems = services.filter((s) => s.name.toLowerCase().includes("pedicure")).slice(0, 4);

  if (manicureItems.length === 0 && pedicureItems.length === 0) {
    manicureItems = services.slice(0, 4);
    pedicureItems = services.slice(4, 8);
  }

  const pricingGroups = [
    { title: "Manicure Services", items: manicureItems },
    { title: "Pedicure Services", items: pedicureItems },
  ];

  return (
    <section className="py-20 lg:py-32 bg-gradient-to-b from-[var(--background)] to-[#FAF8F5]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center mb-16 lg:mb-20">
          <h2 className="text-4xl lg:text-5xl font-light text-[var(--foreground)] mb-4">{headline}</h2>
          <p className="text-lg font-light text-[var(--muted)]">{subheadline}</p>
        </div>

        <div className="space-y-20 lg:space-y-32">
          {pricingGroups.map((group, groupIdx) =>
            group.items.length > 0 ? (
              <div key={groupIdx} className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                <div className={groupIdx % 2 === 1 ? "lg:order-2" : ""}>
                  <div className="aspect-[4/3] bg-white overflow-hidden shadow-lg">
                    <div className="w-full h-full bg-gradient-to-br from-[#E8D5C4] to-[#D4B5A0] flex items-center justify-center">
                      <span className="text-[var(--muted)] text-sm font-mono">[{group.title}]</span>
                    </div>
                  </div>
                </div>

                <div className={groupIdx % 2 === 1 ? "lg:order-1" : ""}>
                  <h3 className="text-3xl font-light text-[var(--foreground)] mb-8 lg:mb-12">{group.title}</h3>
                  <div className="space-y-6">
                    {group.items.map((service) => (
                      <div
                        key={String(service._id)}
                        className="flex items-start justify-between gap-6 pb-6 border-b border-[var(--border)] last:border-0"
                      >
                        <div className="flex-1 space-y-1">
                          <h4 className="text-lg font-light text-[var(--foreground)]">{service.name}</h4>
                          {service.description && (
                            <p className="text-sm font-light text-[var(--muted)]">{service.description}</p>
                          )}
                        </div>
                        {(service.basePrice !== undefined ||
                          service.price !== undefined ||
                          service.priceMode === "on_request") && (
                          <div className="text-lg font-light text-[var(--foreground)] whitespace-nowrap">
                            {formatServicePrice(
                              service.basePrice ?? service.price,
                              service.priceMode,
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-8">
                    <a
                      href={`${base}/termini`}
                      className="inline-flex items-center gap-2 text-sm tracking-wide text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
                    >
                      Book Appointment
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            ) : null
          )}
        </div>
      </div>
    </section>
  );
}
