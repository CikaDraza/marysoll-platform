"use client";
/**
 * Theme10Landing — „Silver Atelier" (dizajn: Ash Studio, manikir & pedikir).
 *
 *   hero / about / gallery /
 *   services.catalog / team          → ThemeBlock
 *   usluge 01–04 / higijena / CTA    → theme-10 native (sadržaj teme)
 *   header / footer / booking modal  → theme-10 native view model
 *
 * BOOKING je launcher, ne sekcija (spec 6.10/6.11): svaki CTA na strani otvara
 * isti modal, pa provider stoji iznad kompozicije i ne zavisi od
 * `appointmentSection.enabled`. theme-10 nema renderer za `booking.services`.
 *
 * Boje i fontovi su zaključani (`colorPolicy: "locked"`), kao theme-7/8/9.
 */
import { useMemo } from "react";
import { BookLink } from "../theme-10/BookLink";
import { THEME10_BLOCK_RENDERERS } from "../theme-10/blocks";
import { Theme10BookingProvider } from "../theme-10/booking/Theme10BookingProvider";
import {
  EASE,
  FOCUS_RING,
  THEME10_ANCHORS,
  THEME10_FONT_HREF,
} from "../theme-10/constants";
import { Theme10CtaBand } from "../theme-10/CtaBand";
import { Theme10Footer } from "../theme-10/Footer";
import { Theme10Header } from "../theme-10/Header";
import { Theme10Hygiene } from "../theme-10/Hygiene";
import { buildTheme10Nav } from "../theme-10/nav";
import { Theme10ServicesStrip } from "../theme-10/ServicesStrip";
import { ThemeBlock } from "../blocks/ThemeBlock";
import { ThemeBlockScope } from "../blocks/ThemeBlockScope";
import type { ThemeLandingProps } from "./types";

export function Theme10Landing(props: ThemeLandingProps) {
  const { blockData, clientSlug, document, resolveHref, tenantSlug, themeNative } =
    props;

  const native = themeNative["theme-10"]!;

  const routing = useMemo(
    () => ({ tenantSlug, clientSlug, resolveHref }),
    [tenantSlug, clientSlug, resolveHref],
  );

  // Nav i sidra nude samo sekcije koje su zaista na strani.
  const sections = useMemo(() => {
    const present = new Set(document.sections.map((s) => s.id));
    return {
      about: present.has("about"),
      gallery: present.has("gallery"),
      prices: present.has("servicesPreview") && native.booking.services.length > 0,
    };
  }, [document, native.booking.services.length]);
  const nav = useMemo(() => buildTheme10Nav("", sections), [sections]);

  const bookHref = resolveHref("/termini");
  const outlinePill = `inline-flex items-center gap-3 self-start rounded-full border border-ash-ink px-7 py-[15px] text-[11.5px] uppercase tracking-[0.2em] hover:bg-ash-ink hover:text-ash-paper-2 ${EASE} ${FOCUS_RING}`;
  // Triptih vodi na galeriju samo ako je galerija na strani; inače na zakazivanje.
  const styleAction = sections.gallery ? (
    <a href={`#${THEME10_ANCHORS.gallery}`} className={outlinePill}>
      Pogledaj galeriju <span aria-hidden>→</span>
    </a>
  ) : (
    <BookLink href={bookHref} className={outlinePill}>
      Zakaži termin <span aria-hidden>→</span>
    </BookLink>
  );

  return (
    <ThemeBlockScope
      theme="theme-10"
      data={blockData}
      renderers={THEME10_BLOCK_RENDERERS}
      routing={routing}
    >
      <Theme10BookingProvider
        tenantSlug={native.booking.tenantSlug}
        clientSlug={native.booking.clientSlug}
        salon={native.booking.salon}
        services={native.booking.services}
      >
        <div
          lang="sr"
          className="flex min-h-screen flex-col overflow-x-clip bg-ash-paper-2 font-jost text-ash-ink antialiased selection:bg-ash-gold selection:text-white"
        >
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="stylesheet" href={THEME10_FONT_HREF} />

          <Theme10Header
            salonName={native.header.salonName}
            logo={native.header.logo}
            nav={nav}
            homeHref={resolveHref("/")}
            bookHref={bookHref}
            loginHref={resolveHref("/login")}
            clientSlug={clientSlug ?? tenantSlug}
          />

          {/* Redosled mora da prati inventar u `theme-composition.ts`
              (čuva ga composition test). */}
          <main className="flex-1">
            <ThemeBlock document={document} type="content.hero" />
            <Theme10ServicesStrip />
            <ThemeBlock
              document={document}
              type="content.about"
              slots={{ action: styleAction }}
            />
            <Theme10Hygiene moreHref={`#${THEME10_ANCHORS.contact}`} />
            <ThemeBlock document={document} type="content.gallery" />
            <ThemeBlock document={document} type="services.catalog" />
            <ThemeBlock document={document} type="content.team" />
            <Theme10CtaBand
              bookHref={bookHref}
              salonName={native.footer.salonName}
              logo={native.footer.logo}
            />
          </main>

          <Theme10Footer
            footer={native.footer}
            nav={nav}
            privacyHref={resolveHref("/politika-privatnosti")}
          />
        </div>
      </Theme10BookingProvider>
    </ThemeBlockScope>
  );
}
