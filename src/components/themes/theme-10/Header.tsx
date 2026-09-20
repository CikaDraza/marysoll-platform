"use client";
/**
 * Theme10Header — sticky header sa zamućenom srebrnom podlogom.
 *
 * Logo je salonski (`salon.logo`); bez njega ime salona stoji kao tipografski
 * znak u Cormorant-u. Nav prima već razrešene stavke — na početnoj su to sidra
 * sekcija koje postoje, na podstranicama linkovi nazad na te sekcije.
 */
import { useEffect, useState } from "react";
import { BookOpenIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import LoggedButton from "@/components/auth/LoggedButton";
import { useAuth } from "@/hooks/useAuth";
import { BookLink } from "./BookLink";
import { CONTENT_WIDTH, EASE, FOCUS_RING } from "./constants";

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
  /** Početna strana preklapa transparentan header preko hero pozadine. */
  transparentAtTop?: boolean;
}

export function Theme10Header({
  salonName,
  logo,
  nav,
  homeHref,
  bookHref,
  loginHref,
  clientSlug,
  transparentAtTop = false,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const { user, isLoggedIn, isLoading } = useAuth();
  const headerOverHero = transparentAtTop && isAtTop && !menuOpen;

  useEffect(() => {
    const updateScrollState = () => setIsAtTop(window.scrollY < 8);
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ease-out ${
        transparentAtTop ? "-mb-[70px] min-[881px]:-mb-[80px]" : ""
      } ${
        headerOverHero
          ? "border-transparent bg-transparent"
          : "border-b border-ash-ink/8 bg-[rgba(233,232,229,0.9)] backdrop-blur-[14px]"
      }`}
    >
      <div className={`${CONTENT_WIDTH} flex flex-wrap items-center justify-between gap-x-6 gap-y-3.5 px-[clamp(16px,4vw,56px)] py-3.5`}>
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
            className="block h-[42px] w-auto min-[881px]:h-[clamp(38px,5vw,52px)]"
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
            <div className="hidden min-[881px]:block">
              <LoggedButton user={user} tenantSlug={clientSlug} />
            </div>
          ) : (
            <Link
              href={loginHref}
              className={`hidden px-2 text-[11.5px] uppercase tracking-[0.2em] ${headerOverHero ? "text-white/75" : "text-ash-ink-mute"} hover:text-ash-gold min-[881px]:inline ${EASE} ${FOCUS_RING}`}
            >
              Prijava
            </Link>
          ))}
        <BookLink
          href={bookHref}
          className={`inline-flex h-[46px] w-[46px] items-center justify-center rounded-full border p-0 ${headerOverHero ? "border-white/55 text-white" : "border-ash-gold text-ash-ink"} hover:bg-ash-gold hover:text-white min-[881px]:h-auto min-[881px]:w-auto min-[881px]:gap-3 min-[881px]:px-[22px] min-[881px]:py-[13px] min-[881px]:text-[11.5px] min-[881px]:uppercase min-[881px]:tracking-[0.2em] ${EASE} ${FOCUS_RING}`}
        >
          <BookOpenIcon aria-hidden="true" className="size-5 min-[881px]:hidden" />
          <span className="sr-only min-[881px]:not-sr-only">Zakaži termin</span>
          <span aria-hidden className="hidden min-[881px]:inline">→</span>
        </BookLink>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Meni"
          aria-expanded={menuOpen}
          aria-controls="t10-mobile-nav"
          className={`inline-flex h-[46px] w-[46px] flex-none items-center justify-center rounded-full border text-[17px] leading-none min-[881px]:hidden ${headerOverHero ? "border-white/50 text-white" : "border-ash-ink/25 text-ash-ink"} ${FOCUS_RING}`}
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
              className={`py-3.5 text-[12px] uppercase tracking-[0.2em] text-ash-ink-mute min-[881px]:hidden ${FOCUS_RING}`}
            >
              Prijava
            </Link>
          )}
          {!isLoading && isLoggedIn && user && (
            <div className="py-3 min-[881px]:hidden">
              <LoggedButton user={user} tenantSlug={clientSlug} />
            </div>
          )}
        </nav>
      )}
      </div>
    </header>
  );
}
