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
