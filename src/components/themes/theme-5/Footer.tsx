import FacebookIcon from "@/components/assets/icons/FacebookIcon";
import InstagramIcon from "@/components/assets/icons/InstagramIcon";
import TelegramIcon from "@/components/assets/icons/TelegramIcon";
import TiktokIcon from "@/components/assets/icons/TiktokIcon";
import WhatsappIcon from "@/components/assets/icons/WhatsappIcon";
import FooterNewsletterForm from "@/components/marketing/FooterNewsletterForm";
import type { mapCMS } from "@/lib/CMSMapper/mapCMS";
import Image from "next/image";
import Link from "next/link";

type FooterData = ReturnType<typeof mapCMS>["footer"];

export function Theme5Footer({ data }: { data: FooterData }) {
  const base = data?.tenantSlug ? `/${data.tenantSlug}` : "";

  const navItems = [
    { name: "Naslovna", href: `${base}/` },
    { name: "Usluge", href: `${base}/usluge` },
    { name: "Cookie Policy", href: `${base}/cookie-policy` },
    { name: "Pravila zakazivanja", href: `${base}/pravila-zakazivanja` },
    { name: "Politika privatnosti", href: `${base}/politika-privatnosti` },
    { name: "Termini", href: `${base}/termini`, cta: true },
  ];

  const whatsapp =
    data?.social?.whatsapp ||
    (data?.phone ? `https://wa.me/${data.phone.replace(/\D/g, "")}` : null);

  return (
    <footer className="relative isolate overflow-y-visible overflow-x-hidden lg:overflow-x-visible px-8 2xl:px-16 bg-gray-900 py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 border-t border-yellow-500">
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
          <div className="flex flex-wrap flex-0 justify-center lg:justify-end items-start gap-4">
            <dt className="w-auto h-auto border rounded-2xl scale-90 px-3 py-1 text-base/7 font-light border-yellow-500 font-main-font text-left flex">
              {data?.social?.instagram ? (
                <Link
                  href={data.social.instagram}
                  target="_blank"
                  className="flex px-2 items-center gap-1 text-xs text-gray-600 hover:text-(--secondary-color) transition"
                >
                  <InstagramIcon bgColor="gold" />
                </Link>
              ) : (
                <button
                  disabled
                  className="flex px-2 items-center disabled:cursor-not-allowed disabled:text-gray-400 gap-1 text-xs"
                >
                  <InstagramIcon bgColor="gold" />
                </button>
              )}
              {whatsapp ? (
                <Link
                  href={whatsapp}
                  target="_blank"
                  className="flex px-2 items-center gap-1 text-xs text-gray-600 hover:text-(--secondary-color) transition"
                >
                  <WhatsappIcon bgColor="gold" width={24} height={24} />
                </Link>
              ) : (
                <button
                  disabled
                  className="flex px-2 items-center disabled:cursor-not-allowed disabled:opacity-30 gap-1 text-xs"
                >
                  <WhatsappIcon bgColor="gold" width={24} height={24} />
                </button>
              )}
              {data?.social?.tiktok ? (
                <Link
                  href={data.social.tiktok}
                  target="_blank"
                  className="flex items-center px-2 gap-1 text-xs text-gray-600 hover:text-(--secondary-color) transition"
                >
                  <TiktokIcon bgColor="gold" width={24} height={24} />
                </Link>
              ) : (
                <button
                  disabled
                  className="flex px-2 items-center disabled:cursor-not-allowed disabled:text-gray-400 gap-1 text-xs"
                >
                  <TiktokIcon bgColor="gold" width={24} height={24} />
                </button>
              )}
              {data?.social?.facebook ? (
                <Link
                  href={data.social.facebook}
                  target="_blank"
                  className="flex items-center px-2 gap-1 text-xs text-gray-600 hover:text-(--secondary-color) transition"
                >
                  <FacebookIcon bgColor="gold" width={24} height={24} />
                </Link>
              ) : (
                <button
                  disabled
                  className="flex px-2 items-center disabled:cursor-not-allowed disabled:text-gray-400 gap-1 text-xs"
                >
                  <FacebookIcon bgColor="gold" width={24} height={24} />
                </button>
              )}
              {data?.social?.telegram ? (
                <Link
                  href={data.social.telegram}
                  target="_blank"
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-(--secondary-color) transition"
                >
                  <TelegramIcon bgColor="gold" width={24} height={24} />
                </Link>
              ) : (
                <button
                  disabled
                  className="flex px-2 items-center disabled:cursor-not-allowed disabled:text-gray-400 gap-1 text-xs"
                >
                  <TelegramIcon bgColor="gold" width={24} height={24} />
                </button>
              )}
            </dt>
            <div className="w-full">
              <Image
                width={128}
                height={128}
                src={data?.logo}
                alt={data?.name}
                className="w-32 h-32 object-contain mx-auto lg:mx-0 lg:ml-auto"
              />
            </div>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-white/10 text-center text-xs text-gray-300">
          © {new Date().getFullYear()} {data?.salonName}. Powered by Marysoll.
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
