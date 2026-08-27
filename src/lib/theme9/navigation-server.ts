import "server-only";

/**
 * lib/theme9/navigation-server.ts — činjenice za 2C navigation resolver.
 *
 * Tanak I/O sloj oko čistog `navigationResolver.ts`, po istom obrascu po kome
 * je `normalize-theme9-section-state.mts` samo I/O oko `sectionNormalization`.
 * Pravilo se ovde ne donosi; ovde se samo saznaje šta je istina o tenantu.
 *
 * DVA POZIVAOCA, JEDAN PUT DO ISTINE
 *   `ClientHomePage`   → početna strana (ima `tenantId` u ruci)
 *   `TenantPageShell`  → podstranice (ima samo slug)
 * Da svaki računa svoju verziju „ima li tenant edukativni sadržaj", header bi
 * na početnoj i na podstranici mogao da pokaže različit meni.
 *
 * ŠTA SE NE PLAĆA
 * Capability se NE čita dok `/edukacija` ne postoji kao ruta: `resolveEducationHref()`
 * traži oba uslova, pa upit za capability danas ne bi mogao ništa da promeni.
 * Isto tako, činjenice se traže samo za theme-9 — vidi `theme9NavNeedsFacts()`.
 */
import { connectToDB } from "@/lib/db/mongodb";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { Tenant } from "@/models/Tenant";
import { publishedBlogFilter } from "@/lib/tenant/blogPosts";
import { resolveTenantCapability } from "@/lib/platform/capabilities-server";
import {
  EDUCATION_ROUTE_AVAILABLE,
  NO_EDUCATION_SURFACE,
  type Theme9EducationFacts,
} from "./navigationResolver";

/**
 * Da li ova tema uopšte traži činjenice o edukativnoj površini. Isti obrazac
 * kao `shellNeedsServices()` — ostale teme ne plaćaju nijedan upit.
 */
export function theme9NavNeedsFacts(theme: string | undefined): boolean {
  return theme === "theme-9";
}

async function tenantIdBySlug(slug: string): Promise<unknown | null> {
  const tenant = await Tenant.findOne({ slug }).select("_id").lean();
  return tenant ? (tenant as Record<string, unknown>)._id : null;
}

/**
 * Ima li tenant bar jednu objavljenu objavu na postojećem blog putu.
 *
 * `exists()` umesto `countDocuments()`: pitanje je da/ne, a header ne treba
 * tačan broj. Filter je `publishedBlogFilter` — isti onaj koji koriste
 * `/blogs` listing i `content.blog` loader, da nav ne bi tvrdio da sadržaja
 * ima tamo gde ga strana neće prikazati.
 */
async function hasPublishedArticles(tenantId: unknown): Promise<boolean> {
  const found = await NewsletterCampaign.exists(publishedBlogFilter(tenantId));
  return found !== null;
}

export interface Theme9EducationFactsInput {
  /** Kad ga pozivalac već ima — bez dodatnog upita nad `Tenant`. */
  tenantId?: unknown;
  /** Rezervni put: podstranice znaju samo slug. */
  tenantSlug?: string;
}

/**
 * Činjenice o „Edukaciji" za jednog tenanta.
 *
 * FAIL-CLOSED. Kada tenant nije nađen ili upit padne, vraća se
 * `NO_EDUCATION_SURFACE` — stavka se ne prikazuje. Header koji ćuti je manja
 * šteta od header-a koji vodi na praznu stranu, a ovo je nav, ne sadržaj:
 * greška ne sme da obori render strane.
 */
export async function resolveTheme9EducationFacts(
  input: Theme9EducationFactsInput,
): Promise<Theme9EducationFacts> {
  try {
    await connectToDB();

    const tenantId =
      input.tenantId ??
      (input.tenantSlug ? await tenantIdBySlug(input.tenantSlug) : null);
    if (!tenantId) return NO_EDUCATION_SURFACE;

    // Redosled uslova je isti kao u `resolveEducationHref()`: dok rute nema,
    // capability ne može ništa da promeni, pa se ni ne pita.
    const capabilityEnabled = EDUCATION_ROUTE_AVAILABLE
      ? ((await resolveTenantCapability(String(tenantId), "education.catalog"))
          ?.enabled ?? false)
      : false;

    return {
      routeAvailable: EDUCATION_ROUTE_AVAILABLE,
      capabilityEnabled,
      hasPublishedArticles: await hasPublishedArticles(tenantId),
    };
  } catch (error: unknown) {
    console.error("[theme9 nav] Education facts lookup failed:", error);
    return NO_EDUCATION_SURFACE;
  }
}
