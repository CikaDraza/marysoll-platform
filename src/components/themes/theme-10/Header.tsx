"use client";
/**
 * Theme10Header — sticky header sa zamućenom srebrnom podlogom.
 *
 * Logo je salonski (`salon.logo`); bez njega ime salona stoji kao tipografski
 * znak u Cormorant-u. Nav prima već razrešene stavke — na početnoj su to sidra
 * sekcija koje postoje, na podstranicama linkovi nazad na te sekcije.
 */
import { useState } from "react";
import Link from "next/link";
import LoggedButton from "@/components/auth/LoggedButton";
import { useAuth } from "@/hooks/useAuth";
import { BookLink } from "./BookLink";
import { EASE, FOCUS_RING } from "./constants";

export interface Theme10NavItem {
  label: string;
  href: string;
}

interface Props {
  salonName: string;
  logo?: string | null;
  nav: Theme10NavItem[];
  homeHref: string;
  bookHref: string;
  loginHref: string;
  /** Pravi DB slug — LoggedButton gradi `/{slug}/panel` i na custom domenu. */
  clientSlug?: string;
}

export function Theme10Header({
  salonName,
  logo,
  nav,
  homeHref,
  bookHref,
  loginHref,
  clientSlug,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isLoggedIn, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-x-6 gap-y-3.5 border-b border-ash-ink/8 bg-[rgba(233,232,229,0.9)] px-[clamp(16px,4vw,56px)] py-3.5 backdrop-blur-[14px]">
      <Link
        href={homeHref}
        aria-label={salonName}
        className={`flex items-center ${FOCUS_RING}`}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo je proizvoljnog formata/domena
          <img
            src={logo}
            alt={salonName}
            className="block h-[clamp(38px,5vw,52px)] w-auto"
          />
        ) : (
          <span className="font-cormorant text-[clamp(22px,2.6vw,30px)] uppercase leading-none tracking-[0.12em] text-ash-ink">
            {salonName}
          </span>
        )}
      </Link>

      <nav
        aria-label="Glavna navigacija"
        className="hidden flex-wrap gap-[clamp(14px,2vw,30px)] text-[12px] uppercase tracking-[0.16em] min-[881px]:flex"
      >
        {nav.map((item, i) => (
          <a
            key={item.href}
            href={item.href}
            className={`${i === 0 ? "font-medium text-ash-ink" : "text-ash-ink-mute"} hover:text-ash-gold ${EASE} ${FOCUS_RING}`}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-2.5">
        {!isLoading &&
          (isLoggedIn && user ? (
            <div className="hidden sm:block">
              <LoggedButton user={user} tenantSlug={clientSlug} />
            </div>
          ) : (
            <Link
              href={loginHref}
              className={`hidden px-2 text-[11.5px] uppercase tracking-[0.2em] text-ash-ink-mute hover:text-ash-gold sm:inline ${EASE} ${FOCUS_RING}`}
            >
              Prijava
            </Link>
          ))}
        <BookLink
          href={bookHref}
          className={`inline-flex items-center gap-3 whitespace-nowrap rounded-full border border-ash-gold px-[22px] py-[13px] text-[11.5px] uppercase tracking-[0.2em] text-ash-ink hover:bg-ash-gold hover:text-white ${EASE} ${FOCUS_RING}`}
        >
          Zakaži termin <span aria-hidden>→</span>
        </BookLink>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Meni"
          aria-expanded={menuOpen}
          aria-controls="t10-mobile-nav"
          className={`inline-flex h-[46px] w-[46px] flex-none items-center justify-center rounded-full border border-ash-ink/25 text-[17px] leading-none text-ash-ink min-[881px]:hidden ${FOCUS_RING}`}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {menuOpen && (
        <nav
          id="t10-mobile-nav"
          aria-label="Mobilna navigacija"
          className="flex w-full flex-col gap-0.5 border-t border-ash-ink/12 pt-1.5 min-[881px]:hidden"
        >
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`border-b border-ash-ink/8 py-3.5 text-[12px] uppercase tracking-[0.2em] text-ash-ink last:border-b-0 ${FOCUS_RING}`}
            >
              {item.label}
            </a>
          ))}
          {!isLoading && !isLoggedIn && (
            <Link
              href={loginHref}
              className={`py-3.5 text-[12px] uppercase tracking-[0.2em] text-ash-ink-mute sm:hidden ${FOCUS_RING}`}
            >
              Prijava
            </Link>
          )}
          {!isLoading && isLoggedIn && user && (
            <div className="py-3 sm:hidden">
              <LoggedButton user={user} tenantSlug={clientSlug} />
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
