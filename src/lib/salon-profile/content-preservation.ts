import type { LandingStructure } from "@/types";

type Landing = LandingStructure["landing"];
type Pages = LandingStructure["pages"];
type Hero = Landing["hero"];
type About = Landing["about"];

const text = (value: string | undefined, fallback = "") => value ?? fallback;
const flag = (value: boolean | undefined, fallback: boolean) => value ?? fallback;

function mapHeroContact(raw: Hero | undefined): Hero["contact"] {
  return {
    ...raw?.contact,
    location: text(raw?.contact?.location),
    phone: text(raw?.contact?.phone),
  };
}

function mapHeroSocial(raw: Hero | undefined): Hero["socialLinks"] {
  return {
    ...raw?.socialLinks,
    instagram: text(raw?.socialLinks?.instagram),
    facebook: text(raw?.socialLinks?.facebook),
    tiktok: text(raw?.socialLinks?.tiktok),
    whatsapp: text(raw?.socialLinks?.whatsapp),
    telegram: text(raw?.socialLinks?.telegram),
  };
}

function mapHeroCtas(raw: Hero | undefined): Hero["ctas"] {
  return {
    ...raw?.ctas,
    primary: {
      ...raw?.ctas?.primary,
      text: text(raw?.ctas?.primary?.text, "Zakaži termin"),
      href: text(raw?.ctas?.primary?.href, "/termini"),
    },
    secondary: raw?.ctas?.secondary
      ? {
          ...raw.ctas.secondary,
          text: text(raw.ctas.secondary.text),
          href: text(raw.ctas.secondary.href),
        }
      : undefined,
  };
}

function mapHero(raw: Hero | undefined): Hero {
  return {
    ...raw,
    enabled: flag(raw?.enabled, true),
    headline: text(raw?.headline),
    subheadline: text(raw?.subheadline),
    whereWhatForWhom: text(raw?.whereWhatForWhom),
    contact: mapHeroContact(raw),
    socialLinks: mapHeroSocial(raw),
    ctas: mapHeroCtas(raw),
  };
}

function mapAbout(raw: About | undefined): About {
  return {
    ...raw,
    enabled: flag(raw?.enabled, true),
    headline: text(raw?.headline),
    paragraphs: raw?.paragraphs ?? [],
    links: raw?.links ?? [],
  };
}

function mapGallery(raw: Landing["gallery"] | undefined): Landing["gallery"] {
  return {
    ...raw,
    enabled: flag(raw?.enabled, true),
    headline: text(raw?.headline),
    subheadline: text(raw?.subheadline),
    instagram: mapGalleryInstagram(raw),
    treatments: raw?.treatments ?? [],
    images: raw?.images ?? [],
  };
}

function mapGalleryInstagram(
  raw: Landing["gallery"] | undefined,
): Landing["gallery"]["instagram"] {
  return {
    ...raw?.instagram,
    username: text(raw?.instagram?.username),
    link: text(raw?.instagram?.link),
    ctaText: text(raw?.instagram?.ctaText),
  };
}

function mapFaq(raw: Landing["faq"] | undefined): Landing["faq"] {
  return {
    ...raw,
    enabled: flag(raw?.enabled, true),
    headline: text(raw?.headline),
    subheadline: text(raw?.subheadline),
    support: {
      ...raw?.support,
      text: text(raw?.support?.text),
      email: text(raw?.support?.email),
    },
    items: raw?.items ?? [],
  };
}

function mapPerks(raw: Landing["perks"] | undefined): Landing["perks"] {
  return {
    ...raw,
    enabled: flag(raw?.enabled, false),
    pill: text(raw?.pill),
    eyebrow: text(raw?.eyebrow),
    headline: text(raw?.headline),
    paragraphs: raw?.paragraphs ?? [],
    images: raw?.images ?? [],
    ctas: mapPerksCtas(raw),
  };
}

function mapPerksCtas(raw: Landing["perks"] | undefined) {
  return {
    ...raw?.ctas,
    primary: {
      ...raw?.ctas?.primary,
      text: text(raw?.ctas?.primary?.text),
      href: text(raw?.ctas?.primary?.href),
    },
    secondary: {
      ...raw?.ctas?.secondary,
      text: text(raw?.ctas?.secondary?.text),
      href: text(raw?.ctas?.secondary?.href),
    },
  };
}

function mapArtists(raw: Landing["artists"] | undefined): Landing["artists"] {
  return {
    ...raw,
    enabled: flag(raw?.enabled, false),
    headline: text(raw?.headline),
    members: raw?.members ?? [],
  };
}

function mapServicesPreview(
  raw: Landing["servicesPreview"] | undefined,
): Landing["servicesPreview"] {
  return {
    ...raw,
    enabled: flag(raw?.enabled, true),
    headline: text(raw?.headline),
    subheadline: text(raw?.subheadline),
    showIcons: flag(raw?.showIcons, true),
  };
}

function mapAppointmentSection(
  raw: Landing["appointmentSection"] | undefined,
): Landing["appointmentSection"] {
  return {
    ...raw,
    enabled: flag(raw?.enabled, true),
    headline: text(raw?.headline),
    subheadline: text(raw?.subheadline),
    instructions: raw?.instructions ?? [],
  };
}

function mapTestimonials(
  raw: Landing["testimonials"] | undefined,
): Landing["testimonials"] {
  return {
    ...raw,
    enabled: flag(raw?.enabled, true),
    headline: text(raw?.headline),
  };
}

function mapBlog(raw: Landing["blog"] | undefined): Landing["blog"] {
  return {
    ...raw,
    enabled: flag(raw?.enabled, false),
    headline: text(raw?.headline),
    paragraph: text(raw?.paragraph),
  };
}

function mapServicesPage(raw: Pages): Pages["servicesPage"] {
  return {
    ...raw.servicesPage,
    headline: text(raw.servicesPage?.headline),
    subheadline: text(raw.servicesPage?.subheadline),
    paragraph: text(raw.servicesPage?.paragraph),
  };
}

function mapAppointmentPageCtas(raw: Pages) {
  return {
    ...raw.appointmentsPage?.ctas,
    primary: {
      ...raw.appointmentsPage?.ctas?.primary,
      text: text(raw.appointmentsPage?.ctas?.primary?.text),
      href: text(raw.appointmentsPage?.ctas?.primary?.href),
    },
    secondary: {
      ...raw.appointmentsPage?.ctas?.secondary,
      text: text(raw.appointmentsPage?.ctas?.secondary?.text),
      href: text(raw.appointmentsPage?.ctas?.secondary?.href),
    },
  };
}

function mapAppointmentsPage(raw: Pages): Pages["appointmentsPage"] {
  return {
    ...raw.appointmentsPage,
    headline: text(raw.appointmentsPage?.headline),
    subheadline: text(raw.appointmentsPage?.subheadline),
    paragraph: text(raw.appointmentsPage?.paragraph),
    ctas: mapAppointmentPageCtas(raw),
  };
}

function mapPages(raw: Pages): Pages {
  return {
    ...raw,
    servicesPage: mapServicesPage(raw),
    appointmentsPage: mapAppointmentsPage(raw),
  };
}

/**
 * Normalizuje polja koja postojeći admin editor poseduje, ali zadržava sva
 * ostala polja iz dokumenta. Ovo je namerno lossless granica: dodavanje nove
 * CMS sekcije ne sme zahtevati hitnu izmenu svakog nepovezanog admin taba.
 */
export function mapLandingStructureForAdmin(
  raw: LandingStructure | undefined,
): LandingStructure {
  const rawLanding = raw?.landing ?? ({} as Landing);
  const rawPages = raw?.pages ?? ({} as Pages);

  return {
    ...raw,
    landing: {
      ...rawLanding,
      hero: mapHero(rawLanding.hero),
      about: mapAbout(rawLanding.about),
      artists: mapArtists(rawLanding.artists),
      servicesPreview: mapServicesPreview(rawLanding.servicesPreview),
      appointmentSection: mapAppointmentSection(rawLanding.appointmentSection),
      stats: rawLanding.stats ?? [],
      testimonials: mapTestimonials(rawLanding.testimonials),
      gallery: mapGallery(rawLanding.gallery),
      faq: mapFaq(rawLanding.faq),
      blog: mapBlog(rawLanding.blog),
      perks: mapPerks(rawLanding.perks),
    },
    pages: mapPages(rawPages),
  };
}

const MERGED_LANDING_SECTIONS = [
  "hero",
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
] as const satisfies readonly (keyof Landing)[];

const MERGED_PAGE_SECTIONS = [
  "servicesPage",
  "appointmentsPage",
] as const satisfies readonly (keyof Pages)[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * `enabled: null` je JEDINI signal za uklanjanje odluke o prikazu (2B.4).
 *
 * Tri-state (`odsutno` / `true` / `false`) se ne može izraziti izostavljanjem
 * ključa: `JSON.stringify` briše `undefined`, a lossless merge izostavljen ključ
 * ispravno tumači kao „ništa ne menjaj". Bez eksplicitnog signala odluka jednom
 * doneta ne bi mogla da se povuče.
 *
 * `null` zato putuje samo od panela do servera i ovde nestaje — u bazi se nikad
 * ne čuva. Vidi `lib/theme9/sectionDisplayChoice.ts`.
 */
function dropClearedDecision(section: Record<string, unknown>): Record<string, unknown> {
  if (section.enabled !== null) return section;
  const next = { ...section };
  delete next.enabled;
  return next;
}

function mergeRecord(current: unknown, incoming: unknown): unknown {
  if (incoming === undefined) return current;
  if (!isRecord(incoming)) return incoming;
  if (!isRecord(current)) return dropClearedDecision(incoming);
  return dropClearedDecision({ ...current, ...incoming });
}

function mergeNamedSections(
  current: Record<string, unknown> | undefined,
  incoming: Record<string, unknown> | undefined,
  keys: readonly string[],
): Record<string, unknown> {
  const merged = { ...current, ...incoming };
  for (const key of keys) {
    merged[key] = mergeRecord(current?.[key], incoming?.[key]);
  }
  return merged;
}

/**
 * Druga linija zaštite za starije ili parcijalne klijente. Sekcija se menja
 * samo kad je poslata; eksplicitne falsy vrednosti ostaju važeće izmene.
 * Spajanje je namerno plitko unutar imenovane CMS sekcije — nema generičkog
 * rekurzivnog merge-a koji bi promenio semantiku nizova ili praznih vrednosti.
 */
export function mergeLandingStructureUpdate(
  current: LandingStructure | undefined,
  incoming: LandingStructure,
): LandingStructure {
  return {
    ...current,
    ...incoming,
    landing: mergeNamedSections(
      current?.landing as unknown as Record<string, unknown> | undefined,
      incoming?.landing as unknown as Record<string, unknown> | undefined,
      MERGED_LANDING_SECTIONS,
    ) as unknown as Landing,
    pages: mergeNamedSections(
      current?.pages as unknown as Record<string, unknown> | undefined,
      incoming?.pages as unknown as Record<string, unknown> | undefined,
      MERGED_PAGE_SECTIONS,
    ) as unknown as Pages,
  };
}
