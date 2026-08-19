/**
 * lib/platform/blocks/types.ts — kontrakt FeatureBlockRegistry-ja (T2A, korak 4).
 *
 * GRANICA (spec 5, 6.1):
 *   @panta/theme-engine      → raspored: sekcije, slotovi, verzije, lifecycle
 *   FeatureBlockRegistry     → šta je blok: config schema, server loader, capability
 *   Theme Composition        → kako konkretna tema slaže blokove + njeni native delovi
 *
 * Ovde NEMA React-a i NEMA Mongoose-a. Renderer se vezuje u temi
 * (`components/themes/blocks/renderers.ts`), jer osam tema ima osam prikaza
 * istog bloka; registry drži samo podatke, shemu i capability.
 *
 * Isto tako, ovde NEMA nijednog izuzetka za teme koje ignorišu CMS flagove —
 * kompatibilnost je odvojen, izbrisiv sloj koji koristi ovaj isti registry.
 */

import type { IService, LandingStructure, SalonProfileData } from "@/types";
import type { PublicTestimonial } from "@/types/public-testimonials";
import type { TenantStats } from "@/lib/tenant/tenantStatsUtils";
import type { MappedBlogPost } from "@/lib/tenant/blogPosts";
import type { LandingSectionKey } from "../theme-client";

type Landing = LandingStructure["landing"];

// ─── Podaci po tipu bloka ─────────────────────────────────────────────────────
// Oblik je namerno "CMS sadržaj sekcije + domenska kolekcija koju blok poseduje".
// Ništa se ne izmišlja: to je tačno ono što danas stigne do sekcija tema kroz
// ThemeLandingProps, samo drugim putem. Prezentacione izvedenice (brandingVars,
// googleFontHref, resolveHref) ostaju posao teme/shell-a.

export interface ContentHeroData {
  content: Landing["hero"] | undefined;
  /**
   * Salon sa spojenim social linkovima (CMS `hero.socialLinks` pobeđuje nad
   * `salon.social`) — merge preseljen iz ThemeLayout-a (l. 77–87), jer je to
   * podatak hero bloka, a ne teme.
   */
  salon: SalonProfileData;
  /**
   * Metrike i staž koje NEKE teme prikazuju u hero-u („godine rada", broj
   * klijenata). Hero ih traži sam iz istog deljenog izvora kao about blok —
   * nema zavisnosti između blokova (ARCHITECTURAL_RULES.md §3.5). Staž se danas
   * čuva u `about` CMS sekciji; to je mesto skladištenja, ne vlasništvo.
   */
  stats: TenantStats | undefined;
  experience: { yearsOfExperience?: number; openingYear?: number };
}

export interface ContentAboutData {
  content: Landing["about"] | undefined;
  /**
   * Tenant metrike — NISU vlasništvo about sekcije, samo ih neke teme prikazuju
   * baš tu (druge u zasebnoj native sekciji). Svaki blok koji ih prikazuje traži
   * ih sam iz deljenog memoizovanog izvora; nema zavisnosti između sekcija.
   * Vidi ARCHITECTURAL_RULES.md §3.5.
   */
  stats: TenantStats | undefined;
  /**
   * Ručno upisane stavke iz CMS-a (`landing.stats`) — druga vrsta iste stvari:
   * `stats` su izmerene metrike, ovo je ono što je vlasnik sam napisao. Theme-4
   * pada na njih kada metrika nema; ostale teme ih danas ne koriste.
   */
  authoredStats: { value: string; label: string }[] | undefined;
  /**
   * Ime salona/brenda — neke teme ga u about sekciji prikazuju kao potpis
   * osnivačice. Blok ga traži sam, ne pozajmljuje od hero bloka (§3.5).
   */
  salonName: string;
  /**
   * Logo salona — About vizit-kartica ga prikazuje. Blok ga traži sam iz
   * deljenog izvora, ne pozajmljuje ga od hero bloka (ARCHITECTURAL_RULES §3.5).
   */
  salonLogo?: string;
}

export interface ContentTeamData {
  content: Landing["artists"] | undefined;
}

export interface ServicesCatalogData {
  content: Landing["servicesPreview"] | undefined;
  services: IService[];
}

export interface BookingServicesData {
  content: Landing["appointmentSection"] | undefined;
  services: IService[];
  /**
   * DUG (T2B): booking sekcije danas primaju ceo salon profil (radno vreme,
   * availabilityMode, manualSlots, vacations). Sužava se kada booking dobije
   * svoju capability granicu — ne u T2A, jer bi to bila promena ponašanja.
   */
  salon: SalonProfileData;
}

export interface ContentTestimonialsData {
  content: Landing["testimonials"] | undefined;
  testimonials: PublicTestimonial[];
  /**
   * Metrike — neke teme porede `reviewCount` sa brojem prikazanih utisaka da bi
   * znale ima li još za dovlačenje. Blok ih traži sam iz deljenog izvora (§3.5).
   */
  stats: TenantStats | undefined;
}

export type GalleryVariant = "images-only" | "images-with-category";

export interface ContentGalleryData {
  content: Landing["gallery"] | undefined;
  /** Iz config-a bloka (CMS override > podrazumevana varijanta teme). */
  galleryVariant: GalleryVariant;
  /** `salon.social.instagram` — fallback kad CMS nema instagram link. */
  instagramFallback: string;
}

export interface ContentFaqData {
  content: Landing["faq"] | undefined;
}

export interface ContentBlogData {
  content: NonNullable<Landing["blog"]> | undefined;
  /**
   * Objave iz server loadera. Ranije ih je theme-9 dovlačila klijentskim
   * hook-om, što je pravilo waterfall posle hidratacije i kršilo granicu iz
   * spec 5.2 („blok dobija podatke kroz loader, tema samo renderuje").
   * Teme koje prikazuju samo naslov i pasus ovo polje jednostavno ignorišu.
   */
  posts: MappedBlogPost[];
  /**
   * Autor objava je salon (ime + logo). Blok ga traži sam iz deljenog izvora —
   * ne pozajmljuje ga od hero ili about bloka (ARCHITECTURAL_RULES.md §3.5).
   */
  author: { name: string; image?: string };
}

export interface ContentPerksData {
  content: NonNullable<Landing["perks"]> | undefined;
}

/** Tipovi blokova koje registry poznaje + podaci koje njihov loader vraća. */
// ─── theme-9 „Expert Editorial" — autorske sekcije ────────────────────────────
// Sve su `content.*`: nose tekst koji vlasnica piše, ne domenske entitete.
// `featuredEducation` i `professionalPath` postaju `education.*` (uz capability
// i loader nad `EducationOffering`) tek kad prestanu da budu teaseri.

export interface ContentAudiencePathsData {
  content: Landing["audiencePaths"] | undefined;
}

export interface ContentTopicHubData {
  content: Landing["topicHub"] | undefined;
}

export interface ContentGuidedCareProcessData {
  content: Landing["guidedCareProcess"] | undefined;
}

export interface ContentCredentialsData {
  content: Landing["credentials"] | undefined;
}

export interface ContentFeaturedEducationData {
  content: Landing["featuredEducation"] | undefined;
}

export interface ContentProfessionalPathData {
  content: Landing["professionalPath"] | undefined;
}

export interface ContentFinalCtaData {
  content: Landing["finalCta"] | undefined;
}

export interface BlockDataByType {
  "content.hero": ContentHeroData;
  "content.about": ContentAboutData;
  "content.team": ContentTeamData;
  "services.catalog": ServicesCatalogData;
  "booking.services": BookingServicesData;
  "content.testimonials": ContentTestimonialsData;
  "content.gallery": ContentGalleryData;
  "content.faq": ContentFaqData;
  "content.blog": ContentBlogData;
  "content.perks": ContentPerksData;
  "content.audience-paths": ContentAudiencePathsData;
  "content.topic-hub": ContentTopicHubData;
  "content.guided-care-process": ContentGuidedCareProcessData;
  "content.credentials": ContentCredentialsData;
  "content.featured-education": ContentFeaturedEducationData;
  "content.professional-path": ContentProfessionalPathData;
  "content.final-cta": ContentFinalCtaData;
}

export type FeatureBlockType = keyof BlockDataByType;

// ─── Config po tipu bloka ─────────────────────────────────────────────────────

export interface BaseBlockConfig {
  /** CMS sekcija iz koje blok čita — postavlja adapter. */
  source: LandingSectionKey;
}

/**
 * PRAVILO: jedan business/content koncept = JEDAN blok. Više mogućih izgleda =
 * varijante tog bloka, nikad duplirani blokovi iste semantike.
 *
 * Zato je izbor prikaza enum, a ne skup boolean-a: `presentationVariant: "cards"`
 * garantuje da je tačno jedna varijanta aktivna, dok `showCards`/`showEditorial`
 * dopuštaju i „obe" i „nijedna" — stanja koja niko nije nameravao.
 *
 * Blok bira sadržaj i poslovnu sposobnost; tema + varijanta biraju kako izgleda.
 * (`content.gallery` ima isti obrazac pod zatečenim imenom `galleryVariant`.)
 */
export type TestimonialsVariant = "cards" | "highlights";

export interface TestimonialsBlockConfig extends BaseBlockConfig {
  presentationVariant?: TestimonialsVariant;
}

export interface HeroBlockConfig extends BaseBlockConfig {
  variant?: "center-image" | "split-left-image" | "grid-right-images";
}

export interface GalleryBlockConfig extends BaseBlockConfig {
  galleryVariant: GalleryVariant;
  variant?: "zigzag" | "masonry";
}

export interface BlockConfigByType {
  "content.hero": HeroBlockConfig;
  "content.about": BaseBlockConfig;
  "content.team": BaseBlockConfig;
  "services.catalog": BaseBlockConfig;
  "booking.services": BaseBlockConfig;
  "content.testimonials": TestimonialsBlockConfig;
  "content.gallery": GalleryBlockConfig;
  "content.faq": BaseBlockConfig;
  "content.blog": BaseBlockConfig;
  "content.perks": BaseBlockConfig;
  // theme-9: sve nose samo `source` — nemaju varijante prikaza.
  "content.audience-paths": BaseBlockConfig;
  "content.topic-hub": BaseBlockConfig;
  "content.guided-care-process": BaseBlockConfig;
  "content.credentials": BaseBlockConfig;
  "content.featured-education": BaseBlockConfig;
  "content.professional-path": BaseBlockConfig;
  "content.final-cta": BaseBlockConfig;
}

// ─── Izvor podataka (request-scoped, dedupe) ──────────────────────────────────

/**
 * Resursi koje loaderi smeju da traže. Svaki je memoizovan po zahtevu: dva
 * bloka koja traže isti resurs → jedan poziv (spec 5.2). Loader ne sme da radi
 * svoj upit mimo ovoga, inače dedupe prestaje da važi.
 */
export interface BlockDataSource {
  landingStructure(): Promise<LandingStructure | undefined>;
  salon(): Promise<SalonProfileData>;
  services(): Promise<IService[]>;
  testimonials(): Promise<PublicTestimonial[]>;
  /** Deljeni izvor metrika — sme ga tražiti svaki blok kome dizajn to nalaže. */
  tenantStats(): Promise<TenantStats | undefined>;
  /**
   * Objavljeni tekstovi tenanta. LENJ: poziva se samo ako neki blok stvarno
   * traži objave, pa teme bez blog sekcije ne plaćaju nijedan upit.
   * Memoizovan po `limit`-u, kao i ostali izvori po zahtevu (spec 5.2).
   */
  blogPosts(limit?: number): Promise<MappedBlogPost[]>;
}

export interface BlockLoaderContext<TConfig> {
  /** Aktivna tema — loader je sme čitati, ali NE sme granati ponašanje po njoj. */
  theme: string;
  tenantSlug?: string;
  config: TConfig;
  deps: BlockDataSource;
}

// ─── Definicija bloka ─────────────────────────────────────────────────────────

export interface ConfigParseResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

export interface FeatureBlockDefinition<
  K extends FeatureBlockType = FeatureBlockType,
> {
  type: K;
  /** Verzije `config` sheme koje ova definicija ume da pročita. */
  schemaVersions: readonly number[];
  /**
   * T2B placeholder: dok ne postoji capability resolver, svi blokovi su `null`
   * (= dostupno svima, kao danas). Non-goal za T2A (spec 9).
   */
  capability: string | null;
  parseConfig(raw: unknown): ConfigParseResult<BlockConfigByType[K]>;
  load(
    ctx: BlockLoaderContext<BlockConfigByType[K]>,
  ): Promise<BlockDataByType[K]>;
}

// Rezultat server prolaza (ResolvedBlock, telemetrija) NIJE deo ovog kontrakta —
// vidi `render-types.ts`. Registry zna šta je blok, ne šta se sa njim desilo
// tokom jednog renderovanja.
