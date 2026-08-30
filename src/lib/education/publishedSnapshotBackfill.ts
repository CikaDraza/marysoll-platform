/**
 * Čist modul: bez importa, bez DB-a, bez I/O — CLI ga učitava direktno
 * (`scripts/backfill-education-published-snapshot.mts`), pa `@/` alias ovde
 * ne bi mogao da se razreši. Oblik snapshot-a je isti kao kod
 * `buildPublishedSnapshot`; test to zaključava.
 */
export interface BackfilledSnapshot {
  title: string;
  slug: string;
  kind: string;
  accessMode: string;
  visibility: string;
  blocks: unknown[];
  seo?: unknown;
  publishedAt: Date;
}

export type BackfillDecision =
  | { kind: "skip"; reason: "draft" | "already-published-snapshot" }
  | { kind: "backfill"; snapshot: BackfilledSnapshot };

interface LegacyEducationRecord {
  status?: unknown;
  accessMode?: unknown;
  publishedSnapshot?: unknown;
  title?: unknown;
  slug?: unknown;
  kind?: unknown;
  visibility?: unknown;
  blocks?: unknown;
  seo?: unknown;
  publishedAt?: unknown;
  updatedAt?: unknown;
}

/**
 * Zapisi objavljeni PRE uvođenja `publishedSnapshot`-a nemaju javnu verziju, pa
 * bi ih javni upit tretirao kao nepostojeće. Backfill uzima zatečenu radnu
 * kopiju kao polaznu javnu verziju — to je jedino stanje koje je ikada bilo
 * vidljivo.
 *
 * Draft zapis se NIKADA ne pretvara u objavljen; idempotentno je, jer zapis sa
 * snapshot-om se preskače.
 */
export function classifyEducationRecord(
  record: LegacyEducationRecord,
): BackfillDecision {
  if (record.status !== "published") {
    return { kind: "skip", reason: "draft" };
  }
  if (record.publishedSnapshot) {
    return { kind: "skip", reason: "already-published-snapshot" };
  }

  const publishedAt =
    toDate(record.publishedAt) ?? toDate(record.updatedAt) ?? new Date();

  return {
    kind: "backfill",
    snapshot: {
      title: String(record.title ?? ""),
      slug: String(record.slug ?? ""),
      kind: String(record.kind ?? ""),
      // Dvočlano `visibility` se preslikava fail-closed: samo eksplicitno
      // „public" postaje javno, sve ostalo ostaje privatno.
      accessMode:
        record.accessMode === "public" ||
        record.accessMode === "gated" ||
        record.accessMode === "private"
          ? String(record.accessMode)
          : record.visibility === "public"
            ? "public"
            : "private",
      visibility: String(record.visibility ?? ""),
      blocks: Array.isArray(record.blocks) ? record.blocks : [],
      seo: record.seo ?? undefined,
      publishedAt,
    },
  };
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}
