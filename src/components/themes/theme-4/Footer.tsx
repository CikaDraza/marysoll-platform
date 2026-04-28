import Link from "next/link";
import FooterNewsletterForm from "@/components/marketing/FooterNewsletterForm";
import InstagramIcon from "@/components/assets/icons/InstagramIcon";
import WhatsappIcon from "@/components/assets/icons/WhatsappIcon";
import TiktokIcon from "@/components/assets/icons/TiktokIcon";
import FacebookIcon from "@/components/assets/icons/FacebookIcon";
import TelegramIcon from "@/components/assets/icons/TelegramIcon";
import { SalonProfileData } from "@/types";

interface Theme4FooterProps {
  salon: SalonProfileData;
  salonName?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  newsletterEmail?: string;
  tenantSlug?: string;
}

export function Theme4Footer({
  salonName,
  tenantSlug,
  salon,
}: Theme4FooterProps) {
  const base = tenantSlug ? `/${tenantSlug}` : "";

  const navItems = [
    { name: "Naslovna", href: `${base}/` },
    { name: "Usluge", href: `${base}/usluge` },
    { name: "Cookie Policy", href: `${base}/cookie-policy` },
    { name: "Pravila zakazivanja", href: `${base}/pravila-zakazivanja` },
    { name: "Politika privatnosti", href: `${base}/politika-privatnosti` },
    { name: "Termini", href: `${base}/termini`, cta: true },
  ];

  const whatsapp =
    salon?.social?.whatsapp ||
    (salon?.phone ? `https://wa.me/${salon.phone.replace(/\D/g, "")}` : null);

  return (
    <footer className="relative isolate overflow-y-visible overflow-x-hidden lg:overflow-x-visible px-8 2xl:px-16 bg-[#4C2D4A] py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 border-t border-[#E8D4AD]">
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
            <ul className="space-y-2 text-sm text-gray-300">
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
          {/* Social icons */}
          <div className="flex flex-0 justify-center lg:justify-end items-start gap-4">
            <dt className="w-auto h-auto border rounded-2xl scale-90 px-3 py-1 text-base/7 font-light border-[#E8D4AD] font-main-font text-left flex">
              {salon.social?.instagram ? (
                <Link
                  href={salon.social.instagram}
                  target="_blank"
                  className="flex px-2 items-center gap-1 text-xs text-gray-600 hover:text-(--secondary-color) transition"
                >
                  <InstagramIcon bgColor="#E8D4AD" />
                </Link>
              ) : (
                <button
                  disabled
                  className="flex px-2 items-center disabled:cursor-not-allowed disabled:text-gray-400 gap-1 text-xs"
                >
                  <InstagramIcon bgColor="#E8D4AD" />
                </button>
              )}
              {whatsapp ? (
                <Link
                  href={whatsapp}
                  target="_blank"
                  className="flex px-2 items-center gap-1 text-xs text-gray-600 hover:text-(--secondary-color) transition"
                >
                  <WhatsappIcon bgColor="#E8D4AD" width={24} height={24} />
                </Link>
              ) : (
                <button
                  disabled
                  className="flex px-2 items-center disabled:cursor-not-allowed disabled:opacity-30 gap-1 text-xs"
                >
                  <WhatsappIcon bgColor="#E8D4AD" width={24} height={24} />
                </button>
              )}
              {salon.social?.tiktok ? (
                <Link
                  href={salon.social.tiktok}
                  target="_blank"
                  className="flex items-center px-2 gap-1 text-xs text-gray-600 hover:text-(--secondary-color) transition"
                >
                  <TiktokIcon bgColor="#E8D4AD" width={24} height={24} />
                </Link>
              ) : (
                <button
                  disabled
                  className="flex px-2 items-center disabled:cursor-not-allowed disabled:text-gray-400 gap-1 text-xs"
                >
                  <TiktokIcon bgColor="#E8D4AD" width={24} height={24} />
                </button>
              )}
              {salon.social?.facebook ? (
                <Link
                  href={salon.social.facebook}
                  target="_blank"
                  className="flex items-center px-2 gap-1 text-xs text-gray-600 hover:text-(--secondary-color) transition"
                >
                  <FacebookIcon bgColor="#E8D4AD" width={24} height={24} />
                </Link>
              ) : (
                <button
                  disabled
                  className="flex px-2 items-center disabled:cursor-not-allowed disabled:text-gray-400 gap-1 text-xs"
                >
                  <FacebookIcon bgColor="#E8D4AD" width={24} height={24} />
                </button>
              )}
              {salon.social?.telegram ? (
                <Link
                  href={salon.social.telegram}
                  target="_blank"
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-(--secondary-color) transition"
                >
                  <TelegramIcon bgColor="#E8D4AD" width={24} height={24} />
                </Link>
              ) : (
                <button
                  disabled
                  className="flex px-2 items-center disabled:cursor-not-allowed disabled:text-gray-400 gap-1 text-xs"
                >
                  <TelegramIcon bgColor="#E8D4AD" width={24} height={24} />
                </button>
              )}
            </dt>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-white/10 text-center text-xs text-gray-300">
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
