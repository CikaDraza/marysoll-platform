/**
 * Jedinstveni javni namespace platforme.
 *
 * System putanje žive u kodu, marketing stranice u `cmsPages`, a tenant
 * slugovi u `Tenant`. Nijedan od ta tri vlasnika ne sme dobiti isti slug.
 */
import { slugify } from "@/helpers/slugify";
import { ProfilPlatforme } from "@/models/ProfilPlatforme";
import { Tenant } from "@/models/Tenant";
import { RESERVED_SYSTEM_SEGMENTS } from "./host-context";

export type PublicSlugConflict = "invalid" | "system" | "cms" | "tenant";

export type PublicSlugAvailability =
  | { available: true; slug: string }
  | { available: false; slug: string; conflict: PublicSlugConflict };

export interface PublicSlugOptions {
  /** Tenant koji menja sopstveni slug nije konflikt sam sa sobom. */
  excludeTenantId?: string;
  /** CMS stranica koja zadržava sopstveni slug nije konflikt sama sa sobom. */
  excludeCmsSlug?: string;
  maxLength?: number;
}

export function publicSlugConflictMessage(conflict: PublicSlugConflict): string {
  switch (conflict) {
    case "system":
      return "Slug je rezervisan za sistemsku rutu";
    case "cms":
      return "Slug koristi postojeća Marketing CMS stranica";
    case "tenant":
      return "Slug koristi postojeći tenant";
    default:
      return "Slug nije validan";
  }
}

/** Normalizacija se deli između CMS-a i tenant-a pre bilo koje provere. */
export function normalizePublicSlug(input: string, maxLength = 60): string {
  return slugify(input).slice(0, maxLength).replace(/-+$/g, "");
}

/**
 * Proverava dostupnost u sva tri javna namespace-a.
 * Poziva se samo pri upisu (ne iz proxy-ja), pa marketing hot path ne radi DB
 * lookup za svaki javni zahtev.
 */
export async function getPublicSlugAvailability(
  rawSlug: string,
  options: PublicSlugOptions = {},
): Promise<PublicSlugAvailability> {
  const slug = normalizePublicSlug(rawSlug, options.maxLength);
  if (!slug) return { available: false, slug, conflict: "invalid" };
  if (RESERVED_SYSTEM_SEGMENTS.has(slug)) {
    return { available: false, slug, conflict: "system" };
  }

  const [platform, tenant] = await Promise.all([
    ProfilPlatforme.findOne({}).select("cmsPages").lean() as Promise<
      { cmsPages?: Record<string, unknown> } | null
    >,
    Tenant.exists({
      slug,
      ...(options.excludeTenantId
        ? { _id: { $ne: options.excludeTenantId } }
        : {}),
    }),
  ]);

  const cmsPageExists = Boolean(platform?.cmsPages?.[slug]);
  if (cmsPageExists && options.excludeCmsSlug !== slug) {
    return { available: false, slug, conflict: "cms" };
  }
  if (tenant) return { available: false, slug, conflict: "tenant" };

  return { available: true, slug };
}

/** Auto-suffix strategija za registraciju tenant-a. */
export async function findAvailableTenantSlug(rawSlug: string): Promise<string> {
  const baseSlug = normalizePublicSlug(rawSlug, 40);
  if (!baseSlug) return "";

  for (let suffix = 0; ; suffix += 1) {
    const candidate = suffix === 0 ? baseSlug : `${baseSlug}-${suffix}`;
    const result = await getPublicSlugAvailability(candidate, { maxLength: 60 });
    if (result.available) return result.slug;
  }
}
