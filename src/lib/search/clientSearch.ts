/**
 * Deljena logika pretrage klijenata — koriste je i lista klijenata
 * (/api/users/search) i lista termina (/api/appointments).
 *
 * Pravila:
 *  - Unos se deli na reči; SVAKA reč mora da se poklopi sa BAR JEDNIM poljem.
 *    Time "Marković Marko" nalazi "Marko Marković" (redosled nije bitan), što
 *    je bitno jer TenantUser nema odvojeno polje za prezime — ime i prezime
 *    žive zajedno u `name`.
 *  - Vodeći @ se skida sa svake reči, pa "@marko" nalazi Instagram/TikTok
 *    handle "marko". Email ostaje netaknut jer se skida samo VODEĆI @
 *    ("marko@gmail.com" se ne dira).
 *  - Regex specijalni karakteri se escape-uju da unos poput "(" ne obori upit.
 */

/** Escape-uje regex metakaraktere iz korisničkog unosa. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Deli unos na reči i skida vodeći @ sa svake.
 * Prazne reči (npr. sam "@") se odbacuju.
 */
export function tokenizeSearch(raw: string): string[] {
  return raw
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/^@+/, ""))
    .filter((token) => token.length > 0);
}

/**
 * Gradi Mongo filter: svaka reč mora da se poklopi sa bar jednim od `fields`.
 * Vraća `null` kada nema šta da se traži — pozivalac tada ne dodaje filter.
 */
export function buildClientSearchFilter(
  raw: string,
  fields: readonly string[],
): { $and: Array<{ $or: Array<Record<string, { $regex: RegExp }>> }> } | null {
  const tokens = tokenizeSearch(raw);
  if (tokens.length === 0 || fields.length === 0) return null;

  return {
    $and: tokens.map((token) => {
      const regex = new RegExp(escapeRegex(token), "i");
      return { $or: fields.map((field) => ({ [field]: { $regex: regex } })) };
    }),
  };
}

/** Polja po kojima se pretražuje lista klijenata (TenantUser). */
export const CLIENT_SEARCH_FIELDS = [
  "name",
  "email",
  "instagram",
  "tiktok",
  "phone",
] as const;

/** Polja po kojima se klijent traži kada se pretražuju termini. */
export const APPOINTMENT_CLIENT_FIELDS = [
  "name",
  "email",
  "instagram",
  "tiktok",
  "phone",
] as const;

/** Polja koja termin nosi na sebi (denormalizovano u trenutku zakazivanja). */
export const APPOINTMENT_OWN_FIELDS = [
  "clientName",
  "clientEmail",
  "clientInstagram",
  "clientPhone",
  "serviceName",
] as const;

/** Minimum profila klijenta potreban za poklapanje pri pretrazi termina. */
export interface ClientSearchCandidate {
  _id: unknown;
  name?: string;
  email?: string;
  instagram?: string;
  tiktok?: string;
  phone?: string;
}

/**
 * Gradi $and klauzule za pretragu termina.
 *
 * Svaka reč sme da se poklopi ILI sa poljem na samom terminu (ime, mejl,
 * Instagram, telefon, usluga) ILI sa profilom klijenta — što je jedini način da
 * TikTok radi, jer ga termin ne nosi na sebi. Zato "@tiktok_handle šišanje"
 * nalazi termin: handle dolazi iz profila, usluga sa termina.
 *
 * `candidates` su klijenti koji se poklapaju sa bar jednom rečju (jedan upit),
 * a poklapanje po rečima se računa ovde.
 */
export function buildAppointmentSearchClauses(
  raw: string,
  candidates: readonly ClientSearchCandidate[],
): Array<{ $or: Array<Record<string, unknown>> }> {
  const tokens = tokenizeSearch(raw);
  if (tokens.length === 0) return [];

  return tokens.map((token) => {
    const regex = new RegExp(escapeRegex(token), "i");

    const matchedIds = candidates
      .filter((candidate) =>
        APPOINTMENT_CLIENT_FIELDS.some((field) => {
          const value = candidate[field];
          return typeof value === "string" && regex.test(value);
        }),
      )
      .map((candidate) => candidate._id);

    const or: Array<Record<string, unknown>> = APPOINTMENT_OWN_FIELDS.map(
      (field) => ({ [field]: { $regex: regex } }),
    );
    if (matchedIds.length > 0) {
      or.push({ clientProfileId: { $in: matchedIds } });
    }

    return { $or: or };
  });
}
