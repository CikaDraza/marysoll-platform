import { z } from "zod";
import { slugify } from "@/helpers/slugify";
import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";
import type { ContentDocumentValidation } from "@/lib/content/validation/contentBlockValidation";
import {
  EDUCATION_INTENT_KEYS,
  SKINCARE_TOPIC_KEYS,
  type EducationIntentKey,
  type EducationTopicKey,
} from "@/lib/education/taxonomy";
import {
  EDUCATION_ACCESS_MODES,
  EDUCATION_CONTENT_KINDS,
  EDUCATION_CONTENT_STATUSES,
  isBodyPubliclyReadable,
  isPubliclyDiscoverable,
  resolveAccessMode,
  type EducationAccessMode,
  type EducationContentKind,
  type EducationContentStatus,
} from "@/types/education-content";

export const EDUCATION_KIND_LABELS: Record<EducationContentKind, string> = {
  advice: "Savet",
  article: "Članak",
  guide: "Vodič",
  video: "Video",
  material: "Materijal",
};

/** Korisnički nazivi; domen ostaje `public` / `gated` / `private`. */
export const EDUCATION_ACCESS_LABELS: Record<EducationAccessMode, string> = {
  public: "Javno",
  gated: "Zaključano",
  private: "Privatno",
};

export const EDUCATION_ACCESS_HELP: Record<EducationAccessMode, string> = {
  public: "Ceo sadržaj je dostupan svima kada ga objavite.",
  gated:
    "Sadržaj se vidi u listi, ali se tekst otvara samo uz vaše odobrenje.",
  private:
    "Nije javno i ne pojavljuje se nigde. Dostupnost pojedinim klijentima određuje se dodelom.",
};

export const EDUCATION_STATUS_LABELS: Record<EducationContentStatus, string> = {
  draft: "Draft",
  published: "Objavljeno",
};

/** Jedan zapis onako kako ga admin lista prikazuje. */
export interface EducationContentSummary {
  id: string;
  title: string;
  slug: string;
  kind: EducationContentKind;
  topicKey?: EducationTopicKey;
  intentKey?: EducationIntentKey;
  accessMode: EducationAccessMode;
  status: EducationContentStatus;
  updatedAt: string;
  /** Stanje objave — bez njega se „neobjavljene izmene" ne može izvesti. */
  workingSavedAt?: string | null;
  publishedSnapshot?: {
    accessMode: EducationAccessMode;
    publishedAt: string;
  } | null;
}

export interface EducationContentRecord extends EducationContentSummary {
  blocks: ContentBlock[];
  hero?: EducationHero;
  publicPreview?: EducationPublicPreview;
  seo?: EducationContentSeo;
  /**
   * Poslednja objavljena verzija. Admin detalj je dobija BEZ blokova — editor
   * uređuje radnu kopiju, a javnu verziju samo prikazuje kao činjenicu.
   */
  publishedSnapshot?: EducationPublishedSnapshotMeta | null;
  workingSavedAt?: string | null;
  createdAt?: string;
}

/** Snapshot metadata koju admin editor vidi (bez blokova). */
export interface EducationPublishedSnapshotMeta {
  title: string;
  slug: string;
  kind: EducationContentKind;
  topicKey?: EducationTopicKey;
  intentKey?: EducationIntentKey;
  accessMode: EducationAccessMode;
  publicPreview?: EducationPublicPreview;
  seo?: EducationContentSeo;
  publishedAt: string;
}

/**
 * NASLOVNA SEKCIJA — jedan izvor istine.
 *
 * Isti podatak je do sada mogao doći sa tri mesta: hero blok u telu, SEO polja
 * i javni pregled. Zato su se naslovne sekcije duplirale i razilazile.
 *
 * Sada postoji jedna sekcija koja hrani i karticu u listi i zaglavlje strane.
 * Naslov namerno NIJE deo nje: on je `EducationContent.title`, isti u listi, u
 * linku i u SEO-u — drugi naslov bi bio drugi izvor istine.
 *
 * SEO i javni pregled od nje uzimaju podrazumevane vrednosti; popunjavaju se
 * samo kada za pretragu ili za zaključan teaser treba nešto drugo.
 */
export interface EducationHero {
  subtitle?: string;
  image?: {
    src: string;
    alt?: string;
    focalPoint?: { x: number; y: number };
  };
  /**
   * Sme li naslovna slika i na sam vrh strane sadržaja.
   *
   * Kartica u listi Edukacije je koristi UVEK — ona je tamo prepoznavanje.
   * Na strani sadržaja je opciona: kada tekst već počinje videom ili slikom iz
   * prvog bloka, naslovna slika iznad njega je ista poruka dva puta.
   *
   * Odsutna vrednost znači „samo kartica": zatečeni zapisi tako ne dobijaju
   * sliku koju vlasnica nije svesno stavila na stranu.
   */
  coverOnPage?: boolean;
}

/** Namerno javni metapodaci zaključanog sadržaja. */
export interface EducationPublicPreview {
  title?: string;
  description?: string;
  coverImage?: string;
}

export interface EducationContentSeo {
  title?: string;
  description?: string;
  ogImage?: string;
}

const seoSchema = z.object({
  title: z.string().trim().max(200).optional(),
  description: z.string().trim().max(500).optional(),
  ogImage: z.string().trim().max(2048).optional(),
});

const publicPreviewSchema = z.object({
  title: z.string().trim().max(200).optional(),
  description: z.string().trim().max(500).optional(),
  coverImage: z.string().trim().max(2048).optional(),
});

const heroSchema = z.object({
  subtitle: z.string().trim().max(500).optional(),
  image: z
    .object({
      src: z.string().trim().max(2048),
      alt: z.string().trim().max(200).optional(),
      focalPoint: z
        .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })
        .optional(),
    })
    .optional(),
  coverOnPage: z.boolean().optional(),
});

const metadataSchema = z.object({
  title: z.string().trim().min(1, "Naslov je obavezan").max(200),
  slug: z.string().trim().max(200).optional(),
  kind: z.enum(EDUCATION_CONTENT_KINDS),
  topicKey: z.enum(SKINCARE_TOPIC_KEYS).optional(),
  intentKey: z.enum(EDUCATION_INTENT_KEYS).optional(),
  accessMode: z.enum(EDUCATION_ACCESS_MODES),
  hero: heroSchema.optional(),
  publicPreview: publicPreviewSchema.optional(),
  seo: seoSchema.optional(),
});

/**
 * Redosled čuvanja unutar jedne editor sesije.
 *
 * Autosave i čuvanje pri izlasku mogu biti u letu istovremeno. Bez ovoga bi
 * ishod odlučivao redosled kojim ih server obradi, pa bi stariji tekst mogao
 * da pregazi noviji. Sesija se poredi zato što novo otvaranje editora uvek sme
 * da piše — njegovo stanje je po definiciji svežije od svega zatečenog.
 */
export const educationSaveOrderSchema = z.object({
  sessionId: z.string().trim().min(1).max(64),
  revision: z.number().int().positive(),
});

export type EducationSaveOrder = z.infer<typeof educationSaveOrderSchema>;

/** Filter koji propušta samo čuvanje koje NIJE preteklo novije. */
export function saveOrderGuard(order: EducationSaveOrder | null) {
  if (!order) return {};
  return {
    $or: [
      { workingSessionId: { $ne: order.sessionId } },
      { workingRevision: { $lt: order.revision } },
      { workingRevision: null },
      { workingRevision: { $exists: false } },
    ],
  };
}

export const educationContentCreateSchema = metadataSchema;
export const educationContentUpdateSchema = metadataSchema.partial();

export type EducationContentCreateInput = z.infer<
  typeof educationContentCreateSchema
>;
export type EducationContentUpdateInput = z.infer<
  typeof educationContentUpdateSchema
>;

/**
 * Slug je host metadata, ne sadržaj bloka. Normalizacija je uvek serverska;
 * klijentski predlog je samo predlog.
 */
export function normalizeEducationSlug(value: string | undefined | null): string {
  if (!value) return "";
  return slugify(
    value
      .trim()
      .replace(/^https?:\/\/[^/]+/i, "")
      .replace(/^\/+/, ""),
  );
}

/**
 * Prazan slug se izvodi iz naslova. Ručno potvrđen slug se NE prepisuje samo
 * zato što se naslov promenio — pozivalac šalje slug tek kad ga stvarno menja.
 */
export function resolveEducationSlug(params: {
  requestedSlug?: string | null;
  title?: string | null;
  fallback?: string | null;
}): string {
  const requested = normalizeEducationSlug(params.requestedSlug);
  if (requested) return requested;

  const existing = normalizeEducationSlug(params.fallback);
  if (existing) return existing;

  return normalizeEducationSlug(params.title);
}

/** Host uslov objave: bar jedan vidljiv i kompletan blok. */
export function hasPublishableBlock(
  validation: ContentDocumentValidation,
): boolean {
  return validation.blocks.some(({ status }) => status === "VALID");
}

export function educationPublishHostFailure(
  validation: ContentDocumentValidation,
  message = "Sadržaj mora imati najmanje jedan vidljiv i kompletan blok da bi bio objavljen",
): ContentDocumentValidation {
  return {
    ...validation,
    valid: false,
    issues: [
      {
        blockId: "document",
        blockType: "document",
        path: "",
        code: "required_content",
        message,
        severity: "error",
      },
    ],
  };
}

/**
 * JAVNI IZVOR ISTINE = `publishedSnapshot`.
 *
 * Root polja su radna kopija i menjaju se pri svakom čuvanju, pa javna strana
 * NIKADA ne sme da ih čita — ni `status`, ni `visibility`, ni `blocks`, ni
 * `slug`. Zapis bez snapshot-a nije javan ni kada mu je `status` „published“
 * (zatečen zapis pre backfill-a ostaje nevidljiv umesto da procuri).
 */
export function hasPublishedSnapshot<T>(
  record: { publishedSnapshot?: T | null } | null | undefined,
): record is { publishedSnapshot: T } {
  return Boolean(record?.publishedSnapshot);
}

type SnapshotAccess = { accessMode?: unknown; visibility?: unknown };

/** Sme li javnost da zna da ovaj zapis postoji (`public` ili `gated`). */
export function isPubliclyConsumable(
  record: { publishedSnapshot?: SnapshotAccess | null } | null | undefined,
): boolean {
  return (
    hasPublishedSnapshot(record) &&
    isPubliclyDiscoverable(resolveAccessMode(record.publishedSnapshot))
  );
}

/** Sme li TELO da ide neautorizovanom čitaocu (samo `public`). */
export function isBodyPubliclyAvailable(
  record: { publishedSnapshot?: SnapshotAccess | null } | null | undefined,
): boolean {
  return (
    hasPublishedSnapshot(record) &&
    isBodyPubliclyReadable(resolveAccessMode(record.publishedSnapshot))
  );
}

/** Vraća objavljenu verziju za javni prikaz ili `null` — nikad radnu kopiju. */
export function resolvePublicEducationContent<TSnapshot extends SnapshotAccess>(
  record: { publishedSnapshot?: TSnapshot | null } | null | undefined,
): TSnapshot | null {
  return isPubliclyConsumable(record) ? record!.publishedSnapshot! : null;
}

/**
 * „Objavljeno · neobjavljene izmene“ — bez poređenja blokova.
 *
 * `workingSavedAt` piše samo Save, `publishedAt` samo Publish, pa je poređenje
 * dva servera vremena dovoljno i deterministično. `updatedAt` za ovo ne valja:
 * njega menja i sama objava.
 *
 * Poznata granica: ako bi se snimanje i objava desili u istoj milisekundi,
 * oznaka bi propustila izmenu. To je kozmetika (badge), ne gubitak podataka, i
 * zahteva dva upisa u razmaku manjem od milisekunde.
 */
export function hasUnpublishedChanges(record: {
  workingSavedAt?: string | Date | null;
  publishedSnapshot?: { publishedAt: string | Date } | null;
}): boolean {
  if (!record.publishedSnapshot) return false;
  if (!record.workingSavedAt) return false;
  return (
    new Date(record.workingSavedAt).getTime() >
    new Date(record.publishedSnapshot.publishedAt).getTime()
  );
}

/** Koliko starih adresa čuvamo; dovoljno za realnu upotrebu, a rast je ograničen. */
export const MAX_PUBLISHED_SLUG_HISTORY = 20;

/**
 * Istorija javnih adresa posle objave.
 *
 * U istoriju ulazi SAMO adresa koja je stvarno bila javno otkrivena — slug iz
 * radne kopije koji nikada nije objavljen nije imao javni URL, pa za njega ne
 * sme postojati preusmerenje. Nova kanonska adresa se iz istorije uklanja.
 */
export function nextPublishedSlugHistory(params: {
  previous?: {
    slug: string;
    accessMode?: unknown;
    visibility?: unknown;
  } | null;
  history?: readonly string[] | null;
  nextSlug: string;
}): string[] {
  const history = [...(params.history ?? [])];
  const previous = params.previous;

  // U istoriju ulazi samo adresa koja je bila javno OTKRIVENA — i `public` i
  // `gated` su to bili; `private` nije nikad imao javni URL.
  if (
    previous &&
    previous.slug &&
    previous.slug !== params.nextSlug &&
    isPubliclyDiscoverable(resolveAccessMode(previous))
  ) {
    history.push(previous.slug);
  }

  return [...new Set(history)]
    .filter((slug) => slug && slug !== params.nextSlug)
    .slice(-MAX_PUBLISHED_SLUG_HISTORY);
}

/**
 * Naslovna slika objavljene verzije, sa fokusom kadra.
 *
 * Računa se pri objavi i pamti, jer je lista čita bez blokova — inače bi
 * kartice morale da učitaju ceo sadržaj samo da bi znale koju sliku i koji
 * kadar da prikažu.
 */
/**
 * Naslovna sekcija za objavu: eksplicitna ako postoji, inače izvedena iz
 * zatečenog hero bloka. Sadržaj pisan pre ove sekcije se tako sam preseli pri
 * prvoj sledećoj objavi, bez migracije.
 */
export function resolvePublishedHero(working: {
  hero?: EducationHero | null;
  blocks: unknown;
}): EducationHero | undefined {
  if (working.hero?.subtitle || working.hero?.image?.src) return working.hero;

  const blocks = Array.isArray(working.blocks) ? working.blocks : [];
  const legacy = blocks.find(
    (block) => (block as { type?: string })?.type === "HeroBlock",
  ) as
    | {
        subtitle?: string;
        images?: { src?: string; alt?: string; focalPoint?: { x: number; y: number } }[];
      }
    | undefined;

  if (!legacy) return undefined;

  const image = legacy.images?.[0];
  return {
    subtitle: legacy.subtitle,
    image: image?.src
      ? { src: image.src, alt: image.alt, focalPoint: image.focalPoint }
      : undefined,
  };
}

export function resolvePublishedCover(working: {
  accessMode?: unknown;
  hero?: EducationHero | null;
  publicPreview?: EducationPublicPreview | null;
  seo?: EducationContentSeo | null;
  blocks: unknown;
}): { src: string; focalPoint?: { x: number; y: number } } | undefined {
  // Kod zaključanog sadržaja javni pregled je jedino što javnost sme da vidi,
  // pa eksplicitno unet pregled pobeđuje naslovnu sekciju. Svuda drugde je
  // naslovna sekcija izvor istine.
  if (
    resolveAccessMode(working) === "gated" &&
    working.publicPreview?.coverImage
  ) {
    return { src: working.publicPreview.coverImage };
  }

  const heroImage = resolvePublishedHero(working)?.image;
  if (heroImage?.src) {
    return { src: heroImage.src, focalPoint: heroImage.focalPoint };
  }

  // `seo.ogImage` ovde nema ulaz: slika za deljenje nije naslovna slika strane.
  return working.publicPreview?.coverImage
    ? { src: working.publicPreview.coverImage }
    : undefined;
}

/** Snapshot koji Publish upisuje — gradi se isključivo od sačuvane radne kopije. */
export function buildPublishedSnapshot(
  working: {
    title: string;
    slug: string;
    kind: EducationContentKind;
    topicKey?: EducationTopicKey;
    intentKey?: EducationIntentKey;
    accessMode?: unknown;
    visibility?: unknown;
    hero?: EducationHero | null;
    publicPreview?: EducationPublicPreview | null;
    blocks: unknown;
    seo?: EducationContentSeo | null;
  },
  publishedAt: Date,
) {
  const accessMode = resolveAccessMode(working);
  const hero = resolvePublishedHero(working);
  const cover = resolvePublishedCover(working);
  return {
    title: working.title,
    hero,
    cover,
    slug: working.slug,
    kind: working.kind,
    topicKey: working.topicKey,
    intentKey: working.intentKey,
    accessMode,
    // Javni pregled ima smisla samo za zaključan sadržaj; za javan je telo
    // ionako dostupno, a za privatan ne sme postojati ništa javno.
    // Izveden pregled uzima ono što je autor napisao za sadržaj, nikada SEO
    // polja: ona su metapodatak za pretragu, a ovo je vidljivi javni tekst.
    publicPreview:
      accessMode === "gated"
        ? (working.publicPreview ?? {
            title: working.title,
            description: hero?.subtitle,
            coverImage: cover?.src,
          })
        : undefined,
    blocks: Array.isArray(working.blocks) ? working.blocks : [],
    seo: working.seo ?? undefined,
    publishedAt,
  };
}

export function educationContentStatuses(): readonly EducationContentStatus[] {
  return EDUCATION_CONTENT_STATUSES;
}
