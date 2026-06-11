import Link from "next/link";
import { PlatformFooter } from "./PlatformFooter";
import { SecondaryContent } from "./SecondaryContent";
import Image from "next/image";
import { MarketingLandingStructure } from "@/types/marketing-landing";
import { normalizeMarketingLanding } from "@/lib/marketing-landing-defaults";

/**
 * Marketing landing page — marysoll.com (DEO 2)
 * Prikazuje se samo na glavnoj domeni.
 */
export function MarketingHomePageSecond({
  initialLanding,
}: {
  initialLanding?: MarketingLandingStructure;
}) {
  const landing = normalizeMarketingLanding(initialLanding);
  const gallery = landing.secondary.gallery;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      {/* DEO 2 — Secondary Content (SEO funnel + edukacija) */}
      <SecondaryContent secondary={landing.secondary} />

      {/* Gallery */}
      <section id="gallery" className="py-20 relative bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl! font-bold text-center text-gray-800 mb-12">
            {gallery.headline}
          </h2>
          <div className="grid grid-cols-1">
            <Image
              width={1200}
              height={600}
              src={gallery.image || "/marysoll-banner.png"}
              alt={gallery.headline || "Marysoll beauty business growth system"}
              className="rounded-xl shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* CTA finnal */}
      <section
        id="cta-finnal"
        className="py-40 text-center px-4 relative isolate"
      >
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <svg
            aria-hidden="true"
            className="absolute top-0 left-[max(50%,25rem)] h-256 w-512 -translate-x-1/2 mask-[radial-gradient(64rem_64rem_at_top,white,transparent)] stroke-gray-200"
          >
            <defs>
              <pattern
                x="50%"
                y={-1}
                id="e813992c-7d03-4cc4-a2bd-151760b470a0"
                width={200}
                height={200}
                patternUnits="userSpaceOnUse"
              >
                <path d="M100 200V.5M.5 .5H200" fill="none" />
              </pattern>
            </defs>
            <svg x="50%" y={-1} className="overflow-visible fill-gray-50">
              <path
                d="M-100.5 0h201v201h-201Z M699.5 0h201v201h-201Z M499.5 400h201v201h-201Z M-300.5 600h201v201h-201Z"
                strokeWidth={0}
              />
            </svg>
            <rect
              fill="url(#e813992c-7d03-4cc4-a2bd-151760b470a0)"
              width="100%"
              height="100%"
              strokeWidth={0}
            />
          </svg>
        </div>
        <h2 className="text-4xl! font-bold text-gray-800 mb-4">
          Počni besplatno
        </h2>
        <p className="text-gray-500 mb-8">
          Besplatan plan za uvek. Plaća se samo kada rasteš.
        </p>
        <Link
          href="/register"
          className="bg-purple-600 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:bg-purple-700 transition"
        >
          Kreiraj salon →
        </Link>
      </section>

      {/* FOOTER */}
      <PlatformFooter />
    </div>
  );
}
