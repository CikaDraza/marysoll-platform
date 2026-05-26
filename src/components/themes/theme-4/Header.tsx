"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bars3Icon,
  XMarkIcon,
  DevicePhoneMobileIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/hooks/useAuth";
import LoggedButton from "@/components/auth/LoggedButton";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import FacebookIcon from "@/components/assets/icons/FacebookIcon";
import InstagramIcon from "@/components/assets/icons/InstagramIcon";
import TelegramIcon from "@/components/assets/icons/TelegramIcon";
import TiktokIcon from "@/components/assets/icons/TiktokIcon";
import WhatsappIcon from "@/components/assets/icons/WhatsappIcon";
import { SalonProfileData } from "@/types";
import Image from "next/image";

interface Props {
  instagramUrl?: string;
  tenantSlug?: string;
  clientSlug?: string;
  salonName?: string;
  salonLogo?: string | null;
  salonPhone?: string | null;
  cta?: { text: string; href: string };
  salon: SalonProfileData;
  primaryColor?: string;
  secondaryColor?: string;
}

export function Theme4Header({
  salonPhone,
  instagramUrl,
  tenantSlug,
  salonName,
  clientSlug,
  cta,
  salon,
  primaryColor = "#a855f7",
  secondaryColor = "#ec4899",
}: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    { name: "Blog", href: `${base}/blogs` },
    { name: "Termini", href: `${base}/termini`, cta: true },
  ];

  const whatsapp =
    salon?.social?.whatsapp ||
    (salon?.phone ? `https://wa.me/${salon.phone.replace(/\D/g, "")}` : null);

  if (isLoading) return null;

  return (
    <header className="w-full border-b border-white/10 bg-[#4C2D4A] text-white">
      <div className="hidden lg:block border border-transparent border-b-[#E8D4AD]/10">
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
        <Link href={`${base}/`} className="flex lg:hidden items-center gap-3">
          {salon.logo ? (
            <Image
              src={salon.logo}
              alt={salonName || "Salon Logo"}
              width={120}
              height={40}
              className="h-10 w-auto"
            />
          ) : (
            <span className="text-base font-semibold text-[#E8D4AD] tracking-wide">
              {salonName}
            </span>
          )}
        </Link>
        {(salon.street || salon.city) && (
          <div className="hidden lg:block relative lg:pl-12 text-center lg:text-left">
            <dt className="text-sm font-light text-[#E8D4AD]">
              <MapPinIcon className="hidden lg:block absolute left-0 top-0 size-8 text-[#E8D4AD]" />
              Lokacija
            </dt>
            <dd className="text-sm text-[#E8D4AD]">
              {salon.street}
              {salon.city ? `, ${salon.city}` : ""}
            </dd>
          </div>
        )}

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

        {/* Desktop login */}
        <div className="hidden lg:block">
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
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden p-2 text-[#E8D4AD] cursor-pointer"
        >
          <Bars3Icon className="size-6" />
        </button>
      </nav>

      {/* Mobile menu */}
      <Transition
        show={mobileMenuOpen}
        as={Dialog}
        onClose={setMobileMenuOpen}
        className="lg:hidden"
      >
        <TransitionChild
          as="div"
          className="fixed inset-0"
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="absolute inset-0 bg-black/50 z-10" />
        </TransitionChild>
        <TransitionChild
          as="div"
          className="fixed inset-y-0 right-0 z-50 w-full max-w-sm"
          enter="transform transition ease-in-out duration-300"
          enterFrom="translate-x-full"
          enterTo="translate-x-0"
          leave="transform transition ease-in-out duration-300"
          leaveFrom="translate-x-0"
          leaveTo="translate-x-full"
        >
          <DialogPanel
            className="h-full bg-[#4C2D4A] px-6 py-6 shadow-2xl"
            style={
              {
                "--primary-color": primaryColor,
                "--secondary-color": secondaryColor,
              } as React.CSSProperties
            }
          >
            <div className="flex items-center justify-between mb-8">
              <span className="font-bold text-lg text-[#E8D4AD]">
                {salonName}
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 cursor-pointer"
              >
                <XMarkIcon className="size-5 text-[#E8D4AD]" />
              </button>
            </div>
            <div className="space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  target={item.external ? "_blank" : "_self"}
                  onClick={() => setMobileMenuOpen(false)}
                  className={
                    item.cta
                      ? "block text-center py-3 border border-[#E8D4AD] text-[#E8D4AD] font-semibold rounded"
                      : "block py-2 text-gray-300 hover:text-[#E8D4AD] font-medium transition"
                  }
                >
                  {item.name}
                </Link>
              ))}
              {/* Social icons */}
              <div className="flex flex-0 my-6 items-center gap-4">
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
              {!isLoggedIn ? (
                <Link
                  href={`${base}/login`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center py-3 border border-white/20 rounded text-gray-300 font-medium"
                >
                  Prijava
                </Link>
              ) : (
                <LoggedButton
                  color="#4C2D4A"
                  backgroundColor="#E8D4AD"
                  user={user!}
                  tenantSlug={clientSlug ?? tenantSlug}
                  onCloseMobileMenu={() => setMobileMenuOpen(false)}
                />
              )}
            </div>
          </DialogPanel>
        </TransitionChild>
      </Transition>
    </header>
  );
}
