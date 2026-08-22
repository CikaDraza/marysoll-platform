/**
 * Pravila za robots.txt — čista funkcija, da se ponašanje može testirati bez
 * Next `headers()` konteksta.
 *
 * ZAŠTO IMENOVANE GRUPE:
 * u robots.txt agent poštuje SAMO najspecifičniju grupu koja ga pominje.
 * Čim postoji `User-agent: Googlebot`, ta grupa POTPUNO poništava `User-agent: *`
 * za Googlebot — pravila se ne nasleđuju i ne spajaju. Zato svaka imenovana
 * grupa mora da ponovi ceo disallow spisak; izostavljanje bi otvorilo admin i
 * auth rute baš najvažnijim crawlerima.
 *
 * OAI-SearchBot je crawler ChatGPT Search-a i mora imati pristup da bi javni
 * tenant sajt uopšte mogao da uđe u odgovore i snippet-e. To je NAMERNO odvojeno
 * od GPTBot-a, koji služi za trening podatke — o njemu ovde nema odluke i
 * politika mu se ne dira (pokriva ga `*`).
 */

import type { MetadataRoute } from "next";

/**
 * Privatne putanje. Bez završne kose crte NAMERNO: `Disallow: /dashboard/`
 * poklapa `/dashboard/nesto` ali NE i `/dashboard`, pa je sama stranica
 * ostajala dostupna crawler-ima. Prefiks bez crte pokriva oba oblika.
 */
export const DISALLOWED_PATHS = [
  "/superadmin",
  "/admin",
  "/dashboard",
  "/api",
  "/login",
  "/register",
  "/auth",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/resend-verification",
] as const;

/**
 * Crawleri kojima se eksplicitno potvrđuje pristup javnom sadržaju.
 * Ne daju im više prava od `*` — postoje da bi pristup bio namera zapisana u
 * kodu, a ne slučajna posledica wildcard-a.
 */
export const EXPLICITLY_ALLOWED_AGENTS = [
  "Googlebot",
  "Bingbot",
  "OAI-SearchBot",
] as const;

export function buildRobotsRules(): MetadataRoute.Robots["rules"] {
  const disallow = [...DISALLOWED_PATHS];
  return [
    { userAgent: "*", allow: "/", disallow },
    ...EXPLICITLY_ALLOWED_AGENTS.map((userAgent) => ({
      userAgent,
      allow: "/",
      // Mora se ponoviti — imenovana grupa ne nasleđuje pravila iz `*`.
      disallow,
    })),
  ];
}
