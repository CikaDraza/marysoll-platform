/**
 * Fallback za tenant title/description kada vlasnik salona NIJE uneo SEO polja.
 *
 * Poredak vlasništva (ručno uvek pobeđuje):
 *
 *   ručni SEO (seo.homeTitle / seo.homeDescription …)
 *     ↓  ako nema
 *   postojeći javni CMS/profil tekst (opis salona, hero copy)
 *     ↓  ako nema
 *   deterministički činjenični fallback iz javnih polja
 *     ↓  ako nema ni to
 *   bezbedan minimum (naziv salona)
 *
 * Sve je čisto i sinhrono. NIKAD se ne poziva AI model tokom rendera stranice —
 * generateMetadata mora ostati determinističan i brz. AI predlog naslova/opisa
 * je zaseban editor workflow (vlasnik pregleda i sačuva), ne request-time poziv.
 *
 * Ovo NE izmišlja činjenice: grad, kategorija i usluge ulaze u tekst samo ako
 * stvarno postoje u podacima tenanta.
 */

/** Gornja granica opisa — praktičan limit za SERP snippet. */
export const DESCRIPTION_MAX = 160;

/**
 * Skida markup i sabija razmake. CMS polja su plain text, ali stari zapisi
 * znaju da nose HTML iz ranijeg editora.
 */
export function normalizeCopy(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Skraćuje na granici REČI — nikad usred reči.
 *
 * Ako se pun tekst uklapa, vraća se nepromenjen (bez elipse). Kada se seče,
 * prvo se pokušava na kraju rečenice unutar limita, pa tek onda na reči.
 */
export function truncateOnWordBoundary(
  raw: string,
  max: number = DESCRIPTION_MAX,
): string {
  const text = normalizeCopy(raw);
  if (text.length <= max) return text;

  const window = text.slice(0, max + 1);

  // Prvo: cela rečenica koja staje u limit.
  const sentenceEnd = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("! "),
    window.lastIndexOf("? "),
  );
  if (sentenceEnd > max * 0.5) {
    return text.slice(0, sentenceEnd + 1).trim();
  }

  // Inače: poslednja cela reč, sa elipsom da se vidi da ima još.
  const lastSpace = window.lastIndexOf(" ");
  const cut = lastSpace > 0 ? window.slice(0, lastSpace) : window.slice(0, max);
  return `${cut.replace(/[\s.,;:–—-]+$/, "")}…`;
}

/** Javna polja iz kojih se izvodi fallback — sva već postoje u modelu. */
export interface TenantMetadataFacts {
  name?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  city?: string | null;
  /** Hero copy iz landing CMS-a (headline/subheadline/whereWhatForWhom). */
  heroCopy?: Array<string | null | undefined>;
  /**
   * Da li salon nudi online zakazivanje. Podrazumevano `true` jer svaki tenant
   * sajt ima /termini stranicu; kada stigne capability flag, prosleđuje se ovde
   * umesto da se izmišlja novo polje u bazi.
   */
  bookingEnabled?: boolean;
}

/** Prvi neprazan normalizovan tekst iz liste kandidata. */
function firstMeaningful(candidates: Array<unknown>): string {
  for (const candidate of candidates) {
    const text = normalizeCopy(candidate);
    if (text.length > 0) return text;
  }
  return "";
}

/**
 * Deterministički činjenični opis. Gradi se SAMO od polja koja postoje —
 * bez grada ako grada nema, bez zakazivanja ako je isključeno.
 */
export function buildFactualDescription(facts: TenantMetadataFacts): string {
  const name = normalizeCopy(facts.name);
  if (!name) return "";

  const city = normalizeCopy(facts.city);
  const booking = facts.bookingEnabled !== false;

  // NAMERNO "Naziv — Grad." umesto "Naziv u Gradu.": srpski lokativ je
  // nepravilan (Loznica→Loznici, Kragujevac→Kragujevcu, Novi Sad→Novom Sadu,
  // Banja Luka→Banjoj Luci) i nijedno prosto pravilo ga ne pokriva. Pogrešan
  // padež u meta opisu vidi svaki posetilac i svaki crawler, pa je bolja
  // formulacija koja ne traži deklinaciju i uvek je gramatički ispravna.
  // Ručno unesen opis, naravno, sme da koristi pravilan padež.
  const opening = city ? `${name} — ${city}.` : `${name}.`;
  const closing = booking
    ? "Pogledajte usluge i zakažite termin online."
    : "Pogledajte usluge i informacije o salonu.";

  return `${opening} ${closing}`;
}

/**
 * Opis stranice: ručni SEO → javni CMS/profil tekst → činjenični fallback.
 * `manual` se vraća netaknut (bez skraćivanja) — uneseni tekst je autoritet.
 */
export function resolveTenantDescription(
  manual: unknown,
  facts: TenantMetadataFacts,
): string {
  const manualText = normalizeCopy(manual);
  if (manualText) return manualText;

  const derived = firstMeaningful([
    facts.description,
    facts.shortDescription,
    ...(facts.heroCopy ?? []),
  ]);
  if (derived) return truncateOnWordBoundary(derived);

  return buildFactualDescription(facts);
}

/**
 * Naslov stranice: ručni SEO → naziv salona (+ grad kada postoji) → prosleđeni
 * bezbedan minimum. `suffix` je namena stranice ("Usluge", "Termini").
 */
export function resolveTenantTitle(
  manual: unknown,
  facts: TenantMetadataFacts,
  options: { suffix?: string; fallback?: string } = {},
): string {
  const manualText = normalizeCopy(manual);
  if (manualText) return manualText;

  const name = normalizeCopy(facts.name);
  if (!name) return options.suffix ?? options.fallback ?? "Salon";

  const city = normalizeCopy(facts.city);
  const base = city ? `${name} — ${city}` : name;
  return options.suffix ? `${options.suffix} — ${base}` : base;
}
