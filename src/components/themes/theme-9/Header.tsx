"use client";
/**
 * Theme9Header — Expert Editorial sticky traka.
 *
 * Prototip je nav rešio klijentskim prebacivanjem `data-page` elemenata; to je
 * bio samo UI. Ovde nav radi kao u ostalim temama: prave rute kroz `base`,
 * `useAuth` + `LoggedButton`, isti ugovor kao Theme7/Theme8 header.
 *
 * NAV NAMERNO NE VODI NA `/usluge` NI `/termini`. Te rute pripadaju salonskom
 * Service Booking toku, a ova tema je education-first: Consultation je zaseban
 * domen (`booking.consultations`). Slanje education tenanta na legacy service
 * flow bi u produkciji napravilo tačno onu prečicu koju tema treba da spreči.
 *
 * Primarni CTA je LAUNCHER (spec 6.11), ne sekcija. Vizuelno stoji, ali je
 * INERTAN dok Expert Booking flow ne stigne (Slice 4/7) — nema fallback na
 * legacy `/termini`.
 *
 * 2C: NAV SE VIŠE NE PIŠE OVDE. Stavke stižu razrešene (`lib/theme9/
 * navigationResolver.ts`), jer je hardkodovan niz vodio na strane koje za dati
 * tenant ne postoje: `/za-klijente` i `/za-profesionalce` vraćaju 404 kad
 * `themePages` nema sadržaj, a seed puni samo jednog tenanta. Header ovde bira
 * SAMO natpise — odluku o postojanju odredišta donosi resolver.
 */
import { useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import LoggedButton from "@/components/auth/LoggedButton";
import { useAuth } from "@/hooks/useAuth";
import type { Theme9NavItem, Theme9NavKey } from "@/lib/theme9/navigationResolver";
import { BookingCta } from "./BookingCta";

interface Props {
  tenantSlug?: string;
  clientSlug?: string;
  /** Obavezno — tema nema fallback ime; ono dolazi iz `SalonProfile`. */
  salonName: string;
  salonLogo?: string | null;
  /**
   * Kratka brend linija ispod imena („Skincare edukacija"). Dolazi iz
   * `SalonProfile.shortDescription`, NIKAD iz `description` — pun opis salona je
   * pasus i gurao je navigaciju i CTA u drugi red. Ovde je dodatno ograničena i
   * skraćena, da ni predugačka vrednost ne razbije traku.
   */
  kicker?: string;
  /** Razrešene stavke (2C) — Header ne odlučuje šta postoji, samo prikazuje. */
  nav: Theme9NavItem[];
}

/** Natpisi su prezentacija i ostaju u temi; resolver zna samo ključeve. */
const NAV_LABELS: Record<Theme9NavKey, string> = {
  home: "Početna",
  "za-klijente": "Za klijente",
  "za-profesionalce": "Za profesionalce",
  education: "Edukacija",
};

/**
 * Aktivna stavka: tačno poklapanje za početnu, prefiks za podstranice — da
 * `/blogs/neki-tekst` i dalje označi „Edukacija".
 */
function isActive(pathname: string | null, href: string, base: string): boolean {
  if (!pathname) return false;
  const home = `${base}/` || "/";
  if (href === home) return pathname === base || pathname === home;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Theme9Header({
  tenantSlug,
  clientSlug,
  salonName,
  salonLogo,
  kicker,
  nav,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const pathname = usePathname();
  const base = tenantSlug ? `/${tenantSlug}` : "";
  // Bez hardkodovanog imena: tema nije Marina, ona joj je prvi tenant.
  const displayName = salonName;

  const navItems = nav.map((item) => ({
    name: NAV_LABELS[item.key],
    href: item.href,
  }));

  return (
    <header className="bg-ee-canvas/85 border-ee-border sticky top-0 z-[60] border-b backdrop-blur-[14px]">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-x-6 gap-y-3.5 px-5 py-3.5 md:px-8 lg:px-14">
        <Link href={`${base}/`} className="flex min-w-0 max-w-[min(100%,340px)] items-center gap-2.5">
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
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="font-newsreader text-ee-accent truncate text-[16.5px]">
              {displayName}
            </span>
            {kicker && (
              <span
                title={kicker}
                className="text-ee-sage max-w-[26ch] truncate text-[9.5px] tracking-[0.2em] uppercase"
              >
                {kicker}
              </span>
            )}
          </span>
        </Link>

        <nav aria-label="Glavna navigacija" className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href, base);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="hover:bg-ee-surface-muted text-ee-text relative rounded-full px-3.5 py-2.5 text-[13.5px] font-medium transition-colors"
              >
                {item.name}
                {/* Donja crta aktivne stranice — po dizajnu, sage, unutar padding-a. */}
                <span
                  aria-hidden
                  className={`bg-ee-sage absolute right-3.5 bottom-1 left-3.5 h-[1.5px] transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
                />
              </Link>
            );
          })}
          <span className="w-3.5" />
          <BookingCta className="py-1.5 pr-[18px] pl-1.5 text-[13.5px]" arrow={30} />
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
            {navItems.map((item) => {
              const active = isActive(pathname, item.href, base);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`text-ee-text rounded-xl px-3 py-2.5 text-[15px] ${active ? "bg-ee-surface-muted" : "hover:bg-ee-surface-muted"}`}
                >
                  {item.name}
                </Link>
              );
            })}
            <span className="mt-2">
              <BookingCta className="w-full justify-center px-5 py-3 text-[14.5px]" arrow={0} />
            </span>
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
