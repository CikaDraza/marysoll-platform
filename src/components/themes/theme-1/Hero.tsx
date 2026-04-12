"use client";
import Image from "next/image";
import Link from "next/link";
import { MapPinIcon, PhoneArrowUpRightIcon } from "@heroicons/react/24/outline";
import type { SalonProfileData } from "@/types";
import WhatsappIcon from "@/components/assets/icons/WhatsappIcon";
import InstagramIcon from "@/components/assets/icons/InstagramIcon copy";
import TiktokIcon from "@/components/assets/icons/TiktokIcon";
import FacebookIcon from "@/components/assets/icons/FacebookIcon";
import TelegramIcon from "@/components/assets/icons/TelegramIcon";

interface Props {
  salon: SalonProfileData;
  heroData: {
    headline: string;
    subheadline?: string;
    whereWhatForWhom?: string;
  };
  /** CTA hrefs are pre-resolved by ThemeLayout (tenantSlug prefix + external URL passthrough). */
  cta: {
    primary: {
      text: string;
      href: string;
    };
    secondary?: {
      text: string;
      href: string;
    };
  };
}

const defaultHeroData = {
  headline: "Kiki Kiss Beauty",
  subheadline: "Kiki Kiss Beauty salon za makeup and nails",
  whereWhatForWhom:
    "Kiki Kiss Beauty je salon lepote u Beogradu specijalizovan za profesionalno šminkanje, oblikovanje obrva i dugotrajan manikir za sve prilike.",
  CTA: {
    text: "Zakaži termin",
    href: "/termini",
  },
};

export function Theme1Hero({ salon, heroData, cta }: Props) {
  // WhatsApp: use explicit social link if set, otherwise derive from phone
  const whatsapp =
    salon?.social?.whatsapp ||
    (salon?.phone ? `https://wa.me/${salon.phone.replace(/\D/g, "")}` : null);

  return (
    <section className="bg-transparent overflow-hidden -mt-20 min-h-screen lg:pb-24">
      <div className="relative isolate px-4">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -lg:top-46 transform-gpu overflow-hidden"
        >
          <Image
            src={"/assets/theme-1/bg-theme-hero-1.svg"}
            width={1920}
            height={1080}
            alt={salon.description}
            className="min-w-[1920px] h-full object-cover object-center"
            preload={true}
          />
        </div>
        <div className="relative left-1/2 -translate-x-1/2 isolate px-4 h-full">
          <div className="mx-auto max-w-full pt-36 lg:pt-26">
            <div className="relative text-center">
              <div className="py-32 lg:w-7xl mx-auto">
                <h1 className="text-5xl lg:text-7xl text-center text-black font-bold">
                  {heroData.headline
                    ? heroData.headline
                    : salon.name
                      ? salon.name
                      : defaultHeroData.headline}
                </h1>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-8">
                  {/* first column on desktop, on mobile second column */}
                  <dl className="order-3 lg:order-1 flex flex-col gap-y-6 lg:gap-y-0 justify-center items-center w-full">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                      {(salon.street || salon.city) && (
                        <div className="relative lg:pl-12 text-center lg:text-left">
                          <dt className="text-sm font-light text-black">
                            <MapPinIcon className="hidden lg:block absolute left-0 top-0 size-8 text-black" />
                            Lokacija
                          </dt>
                          <dd className="text-sm text-black">
                            {salon.street}
                            {salon.city ? `, ${salon.city}` : ""}
                          </dd>
                        </div>
                      )}
                      {salon.phone && (
                        <Link
                          href={`tel:${salon.phone}`}
                          className="relative lg:pl-12 text-center lg:text-left group"
                        >
                          <dt className="text-sm font-light text-black">
                            <PhoneArrowUpRightIcon className="hidden lg:block absolute left-0 top-0 size-8 text-black group-hover:text-(--secondary-color) transition-colors" />
                            Telefon
                          </dt>
                          <dd className="text-sm text-black">{salon.phone}</dd>
                        </Link>
                      )}
                    </div>
                    <div className="mt-10 flex gap-4 justify-between w-full lg:mx-0">
                      <Link
                        href={cta?.primary?.href || defaultHeroData.CTA.href}
                        className="cursor-pointer flex-1 px-7 py-3 bg-(--secondary-color) text-white font-semibold rounded-full hover:bg-(--primary-color) transition text-sm"
                      >
                        {cta?.primary?.text || defaultHeroData.CTA.text}
                      </Link>
                      <Link
                        href={cta?.secondary?.href || "/usluge"}
                        className="px-7 py-3 border border-black hover:border-(--primary-color) text-black font-semibold rounded-full hover:bg-(--primary-color) hover:text-white transition text-sm"
                      >
                        {cta?.secondary?.text || "Naše usluge"}
                      </Link>
                    </div>
                  </dl>
                  {/* second column on desktop, on mobile first column */}
                  <Image
                    src={"/assets/theme-1/statue-makeup.png"}
                    width={350}
                    height={600}
                    alt={salon.description}
                    className="order-2 lg:order-2 w-[280px] lg:w-[350px] h-[600px] object-contain mx-auto -mt-12"
                  />
                  {/* third column on desktop, on mobile third column */}
                  <div className="lg:-mt-16 order-1 lg:order-3 flex flex-col items-center justify-center lg:items-end">
                    <p className="ml-4 mt-0 mb-4 lg:mb-8 lg:-mt-6 text-center lg:text-end text-gray-900">
                      {heroData.subheadline
                        ? heroData.subheadline
                        : salon.description
                          ? salon.description
                          : defaultHeroData.subheadline}
                    </p>
                    <p className="ml-4 mt-0 mb-4 lg:mb-8 lg:-mt-6 text-center lg:text-end text-gray-900">
                      {heroData.whereWhatForWhom
                        ? heroData.whereWhatForWhom
                        : defaultHeroData.whereWhatForWhom}
                    </p>
                    <dt className="w-auto h-auto border rounded-2xl px-4 py-2 text-base/7 font-light border-black font-main-font text-left flex">
                      {salon.social?.instagram ? (
                        <Link
                          href={salon.social.instagram}
                          target="_blank"
                          className="flex px-2 items-center gap-1 text-xs text-gray-600 hover:text-(--primary-color) transition"
                        >
                          <InstagramIcon bgColor="#000000" />
                        </Link>
                      ) : (
                        <button
                          disabled={true}
                          className="flex px-2 items-center disabled:cursor-not-allowed disabled:text-gray-400 gap-1 text-xs text-gray-600 hover:text-(--primary-color) transition"
                        >
                          <InstagramIcon bgColor="#000000" />
                        </button>
                      )}
                      {whatsapp ? (
                        <Link
                          href={whatsapp}
                          target="_blank"
                          className="flex px-2 items-center gap-1 text-xs text-gray-600 hover:text-(--primary-color) transition"
                        >
                          <WhatsappIcon
                            bgColor="#000000"
                            width={24}
                            height={24}
                          />
                        </Link>
                      ) : (
                        <button
                          disabled={true}
                          className="flex px-2 items-center disabled:cursor-not-allowed disabled:opacity-30 gap-1 text-xs text-gray-600 transition"
                        >
                          <WhatsappIcon
                            bgColor="#000000"
                            width={24}
                            height={24}
                          />
                        </button>
                      )}
                      {salon.social?.tiktok ? (
                        <Link
                          href={salon.social.tiktok}
                          target="_blank"
                          className="flex items-center px-2 gap-1 text-xs text-gray-600 hover:text-(--primary-color) transition"
                        >
                          <TiktokIcon
                            bgColor="#000000"
                            width={24}
                            height={24}
                          />
                        </Link>
                      ) : (
                        <button
                          disabled={true}
                          className="flex px-2 items-center disabled:cursor-not-allowed disabled:text-gray-400 gap-1 text-xs text-gray-600 hover:text-(--primary-color) transition"
                        >
                          <TiktokIcon
                            bgColor="#000000"
                            width={24}
                            height={24}
                          />
                        </button>
                      )}
                      {salon.social?.facebook ? (
                        <Link
                          href={salon.social.facebook}
                          target="_blank"
                          className="flex items-center px-2 gap-1 text-xs text-gray-600 hover:text-(--primary-color) transition"
                        >
                          <FacebookIcon
                            bgColor="#000000"
                            width={24}
                            height={24}
                          />
                        </Link>
                      ) : (
                        <button
                          disabled={true}
                          className="flex px-2 items-center disabled:cursor-not-allowed disabled:text-gray-400 gap-1 text-xs text-gray-600 hover:text-(--primary-color) transition"
                        >
                          <FacebookIcon
                            bgColor="#000000"
                            width={24}
                            height={24}
                          />
                        </button>
                      )}
                      {salon.social?.telegram ? (
                        <Link
                          href={salon.social.telegram}
                          target="_blank"
                          className="flex items-center gap-1 text-xs text-gray-600 hover:text-(--primary-color) transition"
                        >
                          <TelegramIcon
                            bgColor="#000000"
                            width={24}
                            height={24}
                          />
                        </Link>
                      ) : (
                        <button
                          disabled={true}
                          className="flex px-2 items-center disabled:cursor-not-allowed disabled:text-gray-400 gap-1 text-xs text-gray-600 hover:text-(--primary-color) transition"
                        >
                          <TelegramIcon
                            bgColor="#000000"
                            width={24}
                            height={24}
                          />
                        </button>
                      )}
                    </dt>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
