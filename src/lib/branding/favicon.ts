import type { IFaviconBranding } from "@/types";
import { faviconColorSchema, faviconStoredUrlSchema } from "./faviconValidation";

export const PLATFORM_FAVICON = "/marysoll_elegant_logo.ico";
const FAVICON_SIZES = [16, 32, 48, 180, 192, 512] as const;
const WIDE_LOGO_RATIO = 1.5;

type FaviconProfile = {
  name?: string | null;
  logo?: string | null;
  branding?: { primaryColor?: string; secondaryColor?: string } | null;
  favicon?: IFaviconBranding | null;
};

export type ResolvedFavicon =
  | { kind: "custom" | "auto"; source: string; version: number }
  | { kind: "monogram"; text: string; background: string; foreground: string; version: number }
  | { kind: "platform"; version: number };

function validUrl(value: unknown, draft: boolean): value is string {
  return faviconStoredUrlSchema.safeParse(value).success ||
    (draft && typeof value === "string" && /^(?:blob:|data:image\/(?:png|jpeg|webp|x-icon);base64,)/i.test(value));
}

function safeColor(value: unknown, fallback: string): string {
  return faviconColorSchema.safeParse(value).success && value ? String(value) : fallback;
}

function positiveVersion(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : 1;
}

function initials(name: unknown): string {
  const words = typeof name === "string" ? name.trim().split(/\s+/).filter(Boolean) : [];
  if (words.length === 0) return "M";
  const compact = words.map((word) => word[0]).join("").replace(/[^\p{L}\p{N}]/gu, "").slice(0, 3).toLocaleUpperCase("sr-RS");
  return compact || "M";
}

/** Jedini izbor izvora: custom → eksplicitni monogram → auto logo → wide monogram → platform. */
export function resolveTenantFavicon(profile: FaviconProfile | null | undefined, options?: { draft?: boolean }): ResolvedFavicon {
  const favicon = profile?.favicon;
  const version = positiveVersion(favicon?.version);
  const background = safeColor(favicon?.backgroundColor, safeColor(profile?.branding?.primaryColor, "#5b21b6"));
  const foreground = safeColor(favicon?.foregroundColor, "#ffffff");
  if (favicon?.mode === "custom" && validUrl(favicon.customUrl, !!options?.draft)) {
    return { kind: "custom", source: favicon.customUrl, version };
  }
  if (favicon?.mode === "monogram") {
    return { kind: "monogram", text: initials(profile?.name), background, foreground, version };
  }
  if (validUrl(profile?.logo, !!options?.draft)) {
    // Ratio se beleži pri novom upload-u. Legacy logo bez dimenzija bezbedno ide
    // kroz contain; nikad ga ne cropujemo naslepo.
    if (typeof favicon?.sourceRatio === "number" && favicon.sourceRatio > WIDE_LOGO_RATIO) {
      return { kind: "monogram", text: initials(profile?.name), background, foreground, version };
    }
    return { kind: "auto", source: profile.logo, version };
  }
  return { kind: "platform", version };
}

/** Cloudinary radi `contain` na transparentnom kvadratu; original se ne menja. */
export function faviconTransformUrl(source: string, size: number): string {
  const marker = "/image/upload/";
  const index = source.indexOf(marker);
  if (index === -1) return source;
  const safeSize = FAVICON_SIZES.includes(size as (typeof FAVICON_SIZES)[number]) ? size : 32;
  const inner = Math.max(1, Math.round(safeSize * 0.78));
  return `${source.slice(0, index + marker.length)}w_${inner},h_${inner},c_fit/w_${safeSize},h_${safeSize},c_pad,b_transparent,f_png/${source.slice(index + marker.length)}`;
}

export function monogramSvg(resolved: Extract<ResolvedFavicon, { kind: "monogram" }>): string {
  const text = resolved.text.replace(/[<>&"']/g, "").slice(0, 3);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="${text}"><rect width="512" height="512" rx="88" fill="${resolved.background}"/><text x="256" y="286" fill="${resolved.foreground}" font-family="Arial,sans-serif" font-size="${text.length > 1 ? 184 : 250}" font-weight="700" text-anchor="middle">${text}</text></svg>`;
}

export function faviconRequestUrl(base: string, version: number, size = 32): string {
  return `${base}/favicon.ico?size=${size}&v=${positiveVersion(version)}`;
}

/** Stable identity of the browser-visible candidate, excluding its cache version. */
export function faviconFingerprint(profile: FaviconProfile | null | undefined): string {
  const resolved = resolveTenantFavicon(profile);
  const { version: _version, ...candidate } = resolved;
  void _version;
  return JSON.stringify(candidate);
}

export function faviconPreviewUrl(resolved: ResolvedFavicon, size = 32): string {
  if (resolved.kind === "monogram") return `data:image/svg+xml,${encodeURIComponent(monogramSvg(resolved))}`;
  if (resolved.kind === "platform") return PLATFORM_FAVICON;
  return faviconTransformUrl(resolved.source, size);
}
