import Link from "next/link";
import { Suspense } from "react";
import { SalonShowcaseLoader } from "./SalonShowcaseLoader";
import { PlatformFooter } from "./PlatformFooter";
import Image from "next/image";

/**
 * Marketing landing page — marysoll.com
 * Prikazuje se samo na glavnoj domeni.
 */
export function MarketingHomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="max-w-7xl mx-auto text-center py-24 px-4">
        <span>Ne zaboravi ipak!</span>
        <h2 className="text-4xl lg:text-8xl font-bold text-gray-900 leading-tight heading-font">
          Beauty business <span className="text-purple-600">growth system</span>
        </h2>
        <p className="mt-6 text-md text-gray-500 max-w-2xl mx-auto">
          Zakazivanje, klijenti, newsletter, tim asistenta — sve na jednom
          mestu. Tvoj biznis, tvoj salon, tvoj domen.
        </p>
        <div className="mt-10 flex gap-4 justify-center">
          <Link
            href="/register"
            className="bg-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-purple-700 transition"
          >
            Registruj salon
          </Link>
          <Link
            href="/pricing"
            className="border border-gray-300 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-50 transition"
          >
            Saznaj šta je uključeno
          </Link>
        </div>
      </section>

      {/* Salon Showcase */}
      <Suspense fallback={null}>
        <SalonShowcaseLoader />
      </Suspense>

      {/* Features */}
      <section id="features" className="py-20 relative bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl! font-bold text-center text-gray-800 mb-12">
            Sve što tvom salonu treba u jednoj slici
          </h2>
          <div className="grid grid-cols-1">
            <Image
              width={1200}
              height={600}
              src="/marysoll-banner.png"
              alt="MarySoll beauty business growth system"
              className="rounded-xl shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" className="py-40 text-center px-4 relative isolate">
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
