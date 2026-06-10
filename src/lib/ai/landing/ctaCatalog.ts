// lib/ai/landing/ctaCatalog.ts
//
// Server-side allowlist of CTA destinations for AI-generated landing pages.
// The landing agent emits a `ctaKey` (enum) per button instead of a free URL;
// the resolver maps that key to a curated { label, href }. Any unknown/missing
// key falls back to DEFAULT_CTA_KEY, which prevents the AI from inventing URLs
// (the "everything links to the canonical marysoll.com homepage" problem).
//
// NOTE: intentionally NOT `server-only` — `ctaKeys` is imported by the shared
// zod schemas in `@/types/landing-blocks`, which are also used client-side.

export interface CtaEntry {
  /** Default visible button copy (AI may override with its own ctaLabel). */
  label: string;
  /** Destination — the single source of truth. Relative path. */
  href: string;
  /** Prompt-only hint telling the agent when to pick this key. */
  description: string;
}

export const CTA_CATALOG = {
  "start-free": {
    label: "Počni besplatno",
    href: "/register",
    description:
      "Glavni CTA — besplatna registracija / 30 dana trial. Koristi kada nije naglašen konkretan plan.",
  },
  "plan-maria": {
    label: "Izaberi Maria plan",
    href: "/register?plan=maria",
    description: "Registracija sa pretselektovanim Maria (osnovnim) planom.",
  },
  "plan-claudia": {
    label: "Izaberi Claudia plan",
    href: "/register?plan=claudia",
    description: "Registracija sa pretselektovanim Claudia (srednjim) planom.",
  },
  "plan-kiki": {
    label: "Izaberi Kiki plan",
    href: "/register?plan=kiki",
    description: "Registracija sa pretselektovanim Kiki (naprednim) planom.",
  },
  "plan-enterprise": {
    label: "Kontaktiraj nas",
    href: "/register?plan=enterprise",
    description: "Enterprise plan — za velike salone i lance.",
  },
  login: {
    label: "Prijavi se",
    href: "/login",
    description: "Za postojeće korisnike koji već imaju nalog.",
  },
  "learn-more": {
    label: "Saznaj više",
    href: "/marketing",
    description: "Sekundarni CTA — više informacija o platformi/funkcijama.",
  },
} as const satisfies Record<string, CtaEntry>;

export type CtaKey = keyof typeof CTA_CATALOG;

/** Non-empty readonly tuple of keys, for `z.enum(...)`. */
export const ctaKeys = Object.keys(CTA_CATALOG) as [CtaKey, ...CtaKey[]];

export const DEFAULT_CTA_KEY: CtaKey = "start-free";

export interface ResolvedCta {
  key: CtaKey;
  label: string;
  href: string;
}

/**
 * Resolve a (possibly unknown) ctaKey to a curated destination.
 * Falls back to DEFAULT_CTA_KEY for anything not in the allowlist.
 */
export function resolveCta(key: string | undefined | null): ResolvedCta {
  const safeKey: CtaKey = key && key in CTA_CATALOG ? (key as CtaKey) : DEFAULT_CTA_KEY;
  const entry = CTA_CATALOG[safeKey];
  return { key: safeKey, label: entry.label, href: entry.href };
}

/** Bullet list of allowed keys + descriptions, injected into the agent prompt. */
export function ctaCatalogPromptList(): string {
  return (Object.keys(CTA_CATALOG) as CtaKey[])
    .map((key) => `- ${key}: ${CTA_CATALOG[key].description}`)
    .join("\n");
}
