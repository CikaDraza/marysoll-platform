/**
 * PERSISTENCE CONTRACT za `landingStructure.landing`.
 *
 * Postoji zato što su TypeScript tip i Mongoose šema dva nezavisna izvora
 * istine za isti objekat, a ništa ih do sada nije vezivalo. Posledica je bila
 * tiho gubljenje podataka: `landing.stats` je deklarisan u tipu, čita ga šest
 * tema, ali ga Mongoose šema nema — pa je sve što vlasnica upiše u CMS-u
 * nestajalo pri snimanju, bez ijedne greške.
 *
 * Ugovor je JEDAN spisak ključeva i DVE nezavisne provere nad njim:
 *
 *   1. compile-time (ovde, hvata ga `tsc --noEmit`)
 *      TypeScript `Landing` ⟷ `LANDING_PERSISTED_KEYS`
 *   2. runtime (`src/models/salonProfileLanding.contract.test.ts`)
 *      Mongoose šema ⟷ `LANDING_PERSISTED_KEYS`
 *
 * Obe provere idu u OBA smera. `satisfies readonly (keyof Landing)[]` ovde ne
 * bi bio dovoljan: uhvatio bi pogrešan ključ u spisku, ali NE bi uhvatio novo
 * polje dodato u `Landing` koje je autor zaboravio da doda u spisak — a to je
 * baš smer u kome se drift dešava.
 *
 * OBIM (namerno uzak): samo direktni ključevi objekta `landing`. Ne pokriva
 * dubinu ugnežđenih struktura, ne pokriva `landingStructure.pages`,
 * `themePages` ni ostatak `SalonProfile`. Prvo zatvaramo klasu greške koju smo
 * empirijski našli; produbljivanje ide tek ako se pokaže potreba.
 */
import type { LandingStructure } from "@/types";

/** `Landing` nije imenovan tip u `@/types` — to je inline objekat pod `landing`. */
export type Landing = LandingStructure["landing"];

/**
 * Jedini spisak. Dodavanje persistence polja u `landing` znači dva koraka:
 * ključ ovde i put u Mongoose šemi. Preskočiš li ijedan, gate pada.
 */
export const LANDING_PERSISTED_KEYS = [
  "hero",
  "stats",
  "about",
  "artists",
  "servicesPreview",
  "appointmentSection",
  "testimonials",
  "gallery",
  "faq",
  "blog",
  "perks",
  "audiencePaths",
  "topicHub",
  "guidedCareProcess",
  "credentials",
  "finalCta",
  "featuredEducation",
  "professionalPath",
] as const;

export type LandingPersistedKey = (typeof LANDING_PERSISTED_KEYS)[number];

type LandingKey = keyof Landing;

/** Prolazi samo za `never`; svaki drugi tip obara `tsc`. */
type AssertNever<T extends never> = T;

/**
 * Smer 1 — polje dodato u `Landing`, a zaboravljeno u ugovoru.
 * Greška izgleda ovako: Type '"novoPolje"' does not satisfy the constraint 'never'.
 */
export type LandingKeysMissingFromContract = AssertNever<
  Exclude<LandingKey, LandingPersistedKey>
>;

/** Smer 2 — ključ u ugovoru koji `Landing` uopšte nema (npr. preimenovan). */
export type ContractKeysMissingFromLanding = AssertNever<
  Exclude<LandingPersistedKey, LandingKey>
>;
