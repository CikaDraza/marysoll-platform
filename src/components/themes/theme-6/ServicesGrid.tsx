import type { IService } from "@/types";
import Link from "next/link";

interface Props {
  headline?: string;
  subheadline?: string;
  services: IService[];
  tenantSlug?: string;
}

export function Theme6ServicesGrid({
  headline = "Our Services",
  subheadline = "Explore our curated selection of premium beauty treatments",
  services,
  tenantSlug,
}: Props) {
  const displayServices = services.slice(0, 3);
  const base = tenantSlug ? `/${tenantSlug}` : "";

  return (
    <section id="services" className="py-20 lg:py-32 bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex items-end justify-between mb-12 lg:mb-16">
          <div className="max-w-2xl">
            <h2 className="text-4xl lg:text-5xl font-light text-[var(--foreground)] mb-4">
              {headline}
            </h2>
            <p className="text-lg font-light text-[var(--muted)]">
              {subheadline}
            </p>
          </div>
          <a
            href={`${base}/usluge`}
            className="hidden lg:inline-flex items-center gap-2 text-sm tracking-wide text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
          >
            View All
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </a>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
          {displayServices.map((service) => (
            <Link
              key={String(service._id)}
              href={`${base}/usluge`}
              className="group"
            >
              <div className="space-y-6">
                <div className="aspect-[3/4] bg-white overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-[#E8D5C4] to-[#D4B5A0] flex items-center justify-center">
                    <span className="text-[var(--muted)] text-sm font-mono">
                      [{service.name}]
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-light text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                      {service.name}
                    </h3>
                    <svg
                      className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                  {service.description && (
                    <p className="text-sm font-light text-[var(--muted)] leading-relaxed">
                      {service.description}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="lg:hidden text-center mt-12">
          <Link
            href={`${base}/usluge`}
            className="inline-flex items-center gap-2 text-sm tracking-wide text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
          >
            View All Services
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
