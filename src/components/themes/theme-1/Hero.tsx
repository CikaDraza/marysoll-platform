"use client";
import Image from "next/image";
import Link from "next/link";
import { MapPinIcon, PhoneArrowUpRightIcon } from "@heroicons/react/24/outline";
import type { SalonProfileData } from "@/types";

interface Props {
  salon: SalonProfileData;
}

export function Theme1Hero({ salon }: Props) {
  const whatsapp = salon.social?.phone ? `https://wa.me/${salon.social.phone.replace(/\D/g, "")}` : "#";

  return (
    <section className="bg-transparent mx-auto lg:pb-24">
      <div className="relative isolate px-4 pt-4">
        <div aria-hidden="true" className="absolute inset-x-0 top-40 lg:-top-40 -z-10 transform-gpu overflow-hidden blur-3xl">
          <div style={{ clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" }}
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72rem]" />
        </div>
        <div className="mx-auto max-w-full">
          <div className="relative text-center">
            <div className="mt-16">
              <h1 className="text-2xl lg:text-4xl text-center text-(--primary-color) font-bold">{salon.name}</h1>
              {salon.description && (
                <p className="mt-4 text-center text-gray-600 max-w-2xl mx-auto">{salon.description}</p>
              )}
            </div>
            <div className="mx-auto max-w-3xl mt-10 flex justify-center">
              <dl className="flex flex-col gap-y-6 lg:gap-y-0 lg:flex-row justify-between items-center w-full">
                {(salon.street || salon.city) && (
                  <div className="relative pl-12 text-center lg:text-left">
                    <dt className="text-sm font-light text-(--secondary-color)">
                      <MapPinIcon className="absolute left-0 top-0 size-8 text-(--primary-color)" />
                      Lokacija
                    </dt>
                    <dd className="text-sm text-(--primary-color)">{salon.street}{salon.city ? `, ${salon.city}` : ""}</dd>
                  </div>
                )}
                {salon.phone && (
                  <Link href={`tel:${salon.phone}`} className="relative pl-12 text-center lg:text-left group">
                    <dt className="text-sm font-light text-(--secondary-color)">
                      <PhoneArrowUpRightIcon className="absolute left-0 top-0 size-8 text-(--primary-color) group-hover:text-(--secondary-color) transition-colors" />
                      Telefon
                    </dt>
                    <dd className="text-sm text-(--primary-color)">{salon.phone}</dd>
                  </Link>
                )}
                <div className="flex gap-4">
                  {salon.social?.instagram && (
                    <Link href={salon.social.instagram} target="_blank" className="flex items-center gap-1 text-xs text-gray-600 hover:text-(--primary-color) transition">
                      <Image src="/insta.svg" alt="Instagram" width={24} height={24} />
                    </Link>
                  )}
                  {salon.social?.tiktok && (
                    <Link href={salon.social.tiktok} target="_blank" className="flex items-center gap-1 text-xs text-gray-600 hover:text-(--primary-color) transition">
                      <Image src="/tiktok.svg" alt="TikTok" width={24} height={24} />
                    </Link>
                  )}
                  {salon.social?.facebook && (
                    <Link href={salon.social.facebook} target="_blank" className="flex items-center gap-1 text-xs text-gray-600 hover:text-(--primary-color) transition">
                      <Image src="/facebook.svg" alt="Facebook" width={24} height={24} />
                    </Link>
                  )}
                </div>
              </dl>
            </div>
            <div className="mt-10 flex gap-4 justify-center">
              <Link href="/termini" className="px-7 py-3 bg-(--secondary-color) text-white font-semibold rounded-full hover:bg-(--primary-color) transition text-sm">
                Zakaži termin
              </Link>
              <Link href="/usluge" className="px-7 py-3 border border-(--primary-color) text-(--primary-color) font-semibold rounded-full hover:bg-(--primary-color) hover:text-white transition text-sm">
                Naše usluge
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
