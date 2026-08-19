"use client";
/**
 * Theme9Header — Expert Editorial sticky traka.
 *
 * Prototip je nav rešio klijentskim prebacivanjem `data-page` elemenata; to je
 * bio samo UI. Ovde nav radi kao u ostalim temama: prave rute kroz `base`,
 * `useAuth` + `LoggedButton`, isti ugovor kao Theme7/Theme8 header.
 *
 * Primarni CTA je LAUNCHER (spec 6.11), ne sekcija. Do T3 Booking Engine-a
 * vodi na `/termini` — to ostaje progressive-enhancement fallback i kasnije,
 * kad dugme dobije `CtaAction: open-widget`.
 */
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import LoggedButton from "@/components/auth/LoggedButton";
import { useAuth } from "@/hooks/useAuth";
import { ArrowCircle } from "./primitives";

interface Props {
  tenantSlug?: string;
  clientSlug?: string;
  salonName?: string;
  salonLogo?: string | null;
  /** Nadnaslov ispod imena (npr. „Skincare edukacija"). */
  kicker?: string;
}

export function Theme9Header({
  tenantSlug,
  clientSlug,
  salonName,
  salonLogo,
  kicker,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const base = tenantSlug ? `/${tenantSlug}` : "";
  const displayName = salonName ?? "Marina B. Stanisavljević";

  // `/za-klijente` i `/za-profesionalce` stižu u svom slice-u (tada im treba i
  // unos u CLIENT_TENANT_PATHS) — do tada nav ne sme da vodi na 404.
  const navItems = [
    { name: "Početna", href: `${base}/` },
    { name: "Usluge", href: `${base}/usluge` },
    { name: "Edukacija", href: `${base}/blogs` },
    { name: "Termini", href: `${base}/termini` },
  ];

  return (
    <header className="bg-ee-canvas/85 border-ee-border sticky top-0 z-[60] border-b backdrop-blur-[14px]">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-x-6 gap-y-3.5 px-5 py-3.5 md:px-8 lg:px-14">
        <Link href={`${base}/`} className="flex items-center gap-2.5">
          {salonLogo ? (
            <Image
              src={salonLogo}
              alt={displayName}
              width={30}
              height={30}
              className="h-[30px] w-[30px] rounded-full object-cover"
            />
          ) : (
            <span className="bg-ee-accent text-ee-canvas font-newsreader flex h-[30px] w-[30px] items-center justify-center rounded-full text-[15px]">
              {displayName.charAt(0)}
            </span>
          )}
          <span className="flex flex-col leading-tight">
            <span className="font-newsreader text-ee-accent text-[16.5px]">
              {displayName}
            </span>
            {kicker && (
              <span className="text-ee-sage text-[9.5px] tracking-[0.2em] uppercase">
                {kicker}
              </span>
            )}
          </span>
        </Link>

        <nav aria-label="Glavna navigacija" className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:bg-ee-surface-muted text-ee-text rounded-full px-3.5 py-2.5 text-[13.5px] font-medium transition-colors"
            >
              {item.name}
            </Link>
          ))}
          <span className="w-3.5" />
          <Link
            href={`${base}/termini`}
            className="group bg-ee-accent hover:bg-ee-accent-lift text-ee-canvas inline-flex items-center gap-2.5 rounded-full py-1.5 pr-[18px] pl-1.5 text-[13.5px] font-semibold transition-colors duration-[250ms]"
          >
            <ArrowCircle size={30} />
            Zakaži konsultaciju
          </Link>
          <span className="ml-2">
            <LoggedButton user={user ?? null} tenantSlug={clientSlug ?? tenantSlug} />
          </span>
        </nav>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Zatvori meni" : "Otvori meni"}
          aria-expanded={menuOpen}
          className="border-ee-border text-ee-text inline-flex h-10 w-10 items-center justify-center rounded-full border lg:hidden"
        >
          {menuOpen ? (
            <XMarkIcon className="h-5 w-5" />
          ) : (
            <Bars3Icon className="h-5 w-5" />
          )}
        </button>
      </div>

      {menuOpen && (
        <div className="border-ee-border bg-ee-canvas border-t px-5 pb-5 lg:hidden">
          <nav aria-label="Glavna navigacija" className="flex flex-col gap-1 pt-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="hover:bg-ee-surface-muted text-ee-text rounded-xl px-3 py-2.5 text-[15px]"
              >
                {item.name}
              </Link>
            ))}
            <Link
              href={`${base}/termini`}
              onClick={() => setMenuOpen(false)}
              className="bg-ee-accent text-ee-canvas mt-2 rounded-full px-5 py-3 text-center text-[14.5px] font-semibold"
            >
              Zakaži konsultaciju
            </Link>
            <span className="mt-2">
              <LoggedButton
                user={user ?? null}
                tenantSlug={clientSlug ?? tenantSlug}
                onCloseMobileMenu={() => setMenuOpen(false)}
              />
            </span>
          </nav>
        </div>
      )}
    </header>
  );
}
