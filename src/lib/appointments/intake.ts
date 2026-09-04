import "server-only";

/**
 * Sanitizacija „zahteva klijentkinje" (intake) pre upisa u termin.
 *
 * Zahtev stiže iz browsera, pa se ništa iz njega ne veruje. Prilog se prihvata
 * SAMO ako pokazuje na Cloudinary i ako `publicId` leži unutar foldera OVOG
 * tenanta — inače bi neko mogao da podmetne tuđu sliku ili proizvoljan URL koji
 * bi se posle prikazao u Marijinom panelu.
 */
import type { IAppointmentAttachment, IAppointmentRequest } from "@/types";

const MAX_NOTE = 1000;
const MAX_URL = 500;
/** Prva verzija: jedna fotografija po terminu. */
const MAX_ATTACHMENTS = 1;
const CLOUDINARY_HOST = "res.cloudinary.com";

function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

/** Referentni link — samo http(s), nikad `javascript:` ni `data:`. */
function cleanUrl(value: unknown): string | undefined {
  const raw = cleanText(value, MAX_URL);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.toString().slice(0, MAX_URL);
  } catch {
    return undefined;
  }
}

function cleanAttachment(
  raw: unknown,
  tenantFolder: string,
): IAppointmentAttachment | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;

  const publicId = cleanText(a.publicId, 300);
  const urlText = cleanText(a.url, MAX_URL);
  if (!publicId || !urlText) return null;

  // Prilog mora da pripada OVOM tenantu — `publicId` je jedini dokaz o tome.
  if (!publicId.startsWith(`${tenantFolder}/`)) return null;

  let url: URL;
  try {
    url = new URL(urlText);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== CLOUDINARY_HOST) return null;

  const num = (v: unknown): number | undefined =>
    typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined;

  return {
    publicId,
    url: url.toString(),
    ...(num(a.width) ? { width: num(a.width) } : {}),
    ...(num(a.height) ? { height: num(a.height) } : {}),
    ...(num(a.bytes) ? { bytes: num(a.bytes) } : {}),
    ...(cleanText(a.format, 10) ? { format: cleanText(a.format, 10) } : {}),
  };
}

/**
 * Vraća zahtev spreman za upis, ili `undefined` kada od njega ne ostane ništa
 * upotrebljivo — prazan objekat se ne upisuje da bi „ima li zahtev" ostalo
 * pouzdana provera u panelu.
 */
export function sanitizeAppointmentRequest(
  raw: unknown,
  tenantFolder: string,
): IAppointmentRequest | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;

  const note = cleanText(r.note, MAX_NOTE);
  const referenceUrl = cleanUrl(r.referenceUrl);
  const attachments = (Array.isArray(r.attachments) ? r.attachments : [])
    .slice(0, MAX_ATTACHMENTS)
    .map((item) => cleanAttachment(item, tenantFolder))
    .filter((item): item is IAppointmentAttachment => item !== null);

  if (!note && !referenceUrl && attachments.length === 0) return undefined;

  return {
    ...(note ? { note } : {}),
    ...(referenceUrl ? { referenceUrl } : {}),
    ...(attachments.length ? { attachments } : {}),
  };
}
