import FacebookIcon from "@/components/assets/icons/FacebookIcon";
import InstagramIcon from "@/components/assets/icons/InstagramIcon copy";
import TelegramIcon from "@/components/assets/icons/TelegramIcon";
import TiktokIcon from "@/components/assets/icons/TiktokIcon";
import WhatsappIcon from "@/components/assets/icons/WhatsappIcon";
import LoggedButton from "@/components/auth/LoggedButton";
import { useAuth } from "@/hooks/useAuth";
import { SalonProfileData } from "@/types";
import { DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  instagramUrl?: string;
  tenantSlug?: string;
  /** Real DB slug — always set, used for LoggedButton panel links */
  clientSlug?: string;
  salonName?: string;
  salonPhone?: string | null;
  cta?: { text: string; href: string };
  salon: SalonProfileData;
}

export function Theme4Header({
  salonPhone,
  instagramUrl,
  tenantSlug,
  salonName,
  clientSlug,
  cta,
  salon,
}: Props) {
  const { user, isLoggedIn, isLoading } = useAuth();
  const pathname = usePathname();
  const base = tenantSlug ? `/${tenantSlug}` : "";
  const showGallery = !!instagramUrl;

  const navItems = [
    { name: "Naslovna", href: `${base}/` },
    { name: "Usluge", href: `${base}/usluge` },
    ...(showGallery
      ? [{ name: "Galerija", href: instagramUrl!, external: true }]
      : []),
    { name: "Termini", href: `${base}/termini`, cta: true },
  ];

  const whatsapp =
    salon?.social?.whatsapp ||
    (salon?.phone ? `https://wa.me/${salon.phone.replace(/\D/g, "")}` : null);

  if (isLoading) return null;

  return (
    <header className="w-full border-b border-white/10 bg-[#4C2D4A] text-white">
      <div className="border border-transparent border-b-[#E8D4AD]/10">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="text-sm text-white flex items-center gap-2">
            <DevicePhoneMobileIcon className="inline-block text-[#E8D4AD] w-10 h-10" />
            <div className="flex flex-col">
              <Link
                className="text-lg hover:text-[#E8D4AD] transition"
                href={`tel:${salonPhone}`}
              >
                Pozovite nas
              </Link>
              <span>{salonPhone}</span>
            </div>
          </div>

          <p className="text-4xl text-[#E8D4AD] font-light font-abril">
            {salonName}
          </p>

          <Link
            href={cta?.href || `${base}/termini`}
            className="border px-6 py-3 text-sm border border-[#E8D4AD] hover:bg-[#E8D4AD] hover:text-black transition"
          >
            {cta?.text || "BOOK"}
          </Link>
        </div>
      </div>
      <nav className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
        <div className="flex flex-0 items-center gap-4">
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
                disabled={true}
                className="flex px-2 items-center disabled:cursor-not-allowed disabled:text-gray-400 gap-1 text-xs text-gray-600 hover:text-(--secondary-color) transition"
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
                disabled={true}
                className="flex px-2 items-center disabled:cursor-not-allowed disabled:opacity-30 gap-1 text-xs text-gray-600 transition"
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
                disabled={true}
                className="flex px-2 items-center disabled:cursor-not-allowed disabled:text-gray-400 gap-1 text-xs text-gray-600 hover:text-(--secondary-color) transition"
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
                disabled={true}
                className="flex px-2 items-center disabled:cursor-not-allowed disabled:text-gray-400 gap-1 text-xs text-gray-600 hover:text-(--secondary-color) transition"
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
                disabled={true}
                className="flex px-2 items-center disabled:cursor-not-allowed disabled:text-gray-400 gap-1 text-xs text-gray-600 hover:text-(--secondary-color) transition"
              >
                <TelegramIcon bgColor="#E8D4AD" width={24} height={24} />
              </button>
            )}
          </dt>
        </div>
        {/* Desktop nav */}
        <div className="hidden lg:flex flex-1 justify-center items-center gap-8">
          {navItems.map((item) => {
            const isActive =
              !item.external &&
              (item.href === `${base}/`
                ? pathname === `${base}/` || pathname === base
                : pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                target={item.external ? "_blank" : "_self"}
                className={
                  item.cta
                    ? "px-5 py-2 text-white text-sm font-semibold rounded-full hover:text-[#E8D4AD] transition-colors"
                    : `text-sm font-medium transition-colors ${isActive ? "text-[#E8D4AD]" : "text-gray-100 hover:text-[#E8D4AD]"}`
                }
              >
                {item.name}
              </Link>
            );
          })}
        </div>
        {!isLoggedIn ? (
          <Link
            href={`${base}/login`}
            className="text-sm font-semibold border border-[#E8D4AD] text-gray-300 hover:text-[#E8D4AD] px-4 py-2 rounded-full transition"
          >
            Prijava
          </Link>
        ) : (
          <LoggedButton
            color="#4C2D4A"
            backgroundColor="#E8D4AD"
            user={user!}
            tenantSlug={clientSlug ?? tenantSlug}
          />
        )}
      </nav>
    </header>
  );
}
