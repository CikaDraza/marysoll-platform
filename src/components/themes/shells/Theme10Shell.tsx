"use client";
/**
 * Theme10Shell — Header/Footer omotač theme-10 za tenant podstranice.
 *
 * Ista zaključana paleta i fontovi kao početna. Podstranice nemaju booking
 * modal: CTA „Zakaži termin" vodi na `/termini`, a nav nazad na sekcije
 * početne strane.
 */
import { THEME10_FONT_HREF } from "../theme-10/constants";
import { Theme10Footer } from "../theme-10/Footer";
import { Theme10Header } from "../theme-10/Header";
import { buildTheme10Nav } from "../theme-10/nav";
import type { ThemeShellProps } from "./types";

export function Theme10Shell(props: ThemeShellProps) {
  const { shellNative, base, children, headerProps, tenantSlug } = props;
  const native = shellNative["theme-10"];
  const nav = buildTheme10Nav(`${base}/`);

  return (
    <div
      lang="sr"
      className="flex min-h-screen flex-col overflow-x-clip bg-ash-paper-2 font-jost text-ash-ink antialiased selection:bg-ash-gold selection:text-white"
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href={THEME10_FONT_HREF} />

      <Theme10Header
        salonName={native?.header.salonName ?? headerProps.salonName}
        logo={native?.header.logo ?? headerProps.salonLogo}
        nav={nav}
        homeHref={`${base}/`}
        bookHref={`${base}/termini`}
        loginHref={`${base}/login`}
        clientSlug={headerProps.clientSlug ?? tenantSlug}
      />

      <main className="flex-1">{children}</main>

      {native && (
        <Theme10Footer
          footer={native.footer}
          nav={nav}
          privacyHref={`${base}/politika-privatnosti`}
        />
      )}
    </div>
  );
}
