export type PreferredContact = "phone" | "instagram" | "email" | "platform";

export function normalizeInstagram(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/^@+/, "") : "";
}

export function normalizeContactValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function hasRegistrationContact(input: {
  phone?: unknown;
  instagram?: unknown;
}): boolean {
  return Boolean(
    normalizeContactValue(input.phone) || normalizeInstagram(input.instagram),
  );
}

export function hasGuestBookingContact(input: {
  phone?: unknown;
  email?: unknown;
  instagram?: unknown;
}): boolean {
  return Boolean(
    normalizeContactValue(input.phone) ||
      normalizeEmail(input.email) ||
      normalizeInstagram(input.instagram),
  );
}

/** Placeholder email generisan za goste bez pravog emaila (…@noemail.guest). */
export function isPlaceholderGuestEmail(email: unknown): boolean {
  const e = normalizeEmail(email);
  return !e || e.endsWith("@noemail.guest");
}

/**
 * Kontakt za PRIKAZ u listama termina/klijenata: pravi email ima prednost;
 * generički gost-email se nikad ne prikazuje — umesto njega Instagram
 * (@tag) pa telefon. Gost uvek ima bar jedno od ta tri.
 */
export function displayClientContact(input: {
  email?: unknown;
  instagram?: unknown;
  phone?: unknown;
}): string {
  const email = normalizeEmail(input.email);
  if (email && !isPlaceholderGuestEmail(email)) return email;
  const instagram = normalizeInstagram(input.instagram);
  if (instagram) return `@${instagram}`;
  const phone = normalizeContactValue(input.phone);
  if (phone) return phone;
  return email;
}

export function inferPreferredContact(input: {
  phone?: unknown;
  email?: unknown;
  instagram?: unknown;
  fallback?: PreferredContact;
}): PreferredContact {
  if (normalizeContactValue(input.phone)) return "phone";
  if (normalizeInstagram(input.instagram)) return "instagram";
  if (normalizeEmail(input.email)) return "email";
  return input.fallback ?? "platform";
}
