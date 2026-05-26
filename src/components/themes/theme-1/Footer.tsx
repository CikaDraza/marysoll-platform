import Link from "next/link";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import FooterNewsletterForm from "@/components/marketing/FooterNewsletterForm";

interface Theme1FooterProps {
  salonName?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  newsletterEmail?: string;
  tenantSlug?: string;
}

export function Theme1Footer({
  salonName,
  tenantSlug,
  instagram,
  facebook,
  tiktok,
}: Theme1FooterProps) {
  const base = tenantSlug ? `/${tenantSlug}` : "";

  const navItems = [
    { name: "Naslovna", href: `${base}/` },
    { name: "Usluge", href: `${base}/usluge` },
    { name: "Blog", href: `${base}/blogs` },
    { name: "Cookie Policy", href: `${base}/cookie-policy` },
    { name: "Pravila zakazivanja", href: `${base}/pravila-zakazivanja` },
    { name: "Politika privatnosti", href: `${base}/politika-privatnosti` },
    { name: "Termini", href: `${base}/termini`, cta: true },
  ];

  return (
    <footer className="relative isolate overflow-y-visible overflow-x-hidden lg:overflow-x-visible px-8 2xl:px-16 bg-gray-900 py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <div className="max-w-xl lg:max-w-lg">
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Prijavite se na naš newsletter
              </h2>
              <p className="mt-4 text-sm text-gray-300">
                Budite u toku sa najnovijim ponudama, trendovima i savetima.
              </p>
              <FooterNewsletterForm />
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-gray-100">Brze veze</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="hover:text-white transition"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-gray-100">Pratite nas</h4>
            <div className="flex gap-4">
              {instagram && (
                <a
                  href={instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition text-sm"
                >
                  Instagram
                </a>
              )}
              {facebook && (
                <a
                  href={facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition text-sm"
                >
                  Facebook
                </a>
              )}
              {tiktok && (
                <a
                  href={tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition text-sm"
                >
                  TikTok
                </a>
              )}
            </div>
            <div className="mt-6">
              <Link
                href={`${base}/panel?tab=Zakazivanja`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-(--secondary-color) text-white text-sm font-semibold rounded-full hover:bg-(--primary-color) transition"
              >
                <CalendarDaysIcon className="size-4" />
                Zakaži termin
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-white/10 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} {salonName}. Powered by Marysoll.
        </div>
      </div>
      <div
        aria-hidden="true"
        className="absolute top-0 bottom-0 overflow-hidden left-1/2 -z-10 -translate-x-1/2 blur-3xl xl:-top-6"
      >
        <div
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
          className="aspect-1155/678 w-288.75 bg-linear-to-tr from-[#ff80b5] to-[#9089fc] opacity-30"
        />
      </div>
    </footer>
  );
}
