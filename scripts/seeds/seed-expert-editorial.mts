/**
 * Seed: Expert Editorial (theme-9) demo sadržaj.
 *
 * STARTER/DEMO PROVISIONING — CMS je trajno mesto tenant autorstva. Default run
 * dopunjava samo missing/prazne top-level starter blokove i konzervativno čuva
 * svaki meaningful sadržaj ili eksplicitnu enabled odluku.
 *
 * BEZBEDNOST:
 *   - allowlist tenanta (`SEEDABLE_TENANTS`) — pogrešan slug bi značio prepisan
 *     tuđi sajt;
 *   - tenant koji još nije theme-9 traži eksplicitni `--provision-theme9`;
 *   - `--force-reseed` je jedini način da demo sadržaj pregazi izmenjen starter
 *     blok i svaki takav upis je u reportu označen kao FORCE;
 *   - `hero`/`about`/`blog`/`shortDescription` dele se sa zatečenim temama i
 *     idu samo uz `--overwrite-shared`, uz ispis onoga što se gubi.
 *
 * Pokretanje (Node 24+, čita .env.local):
 *   npm run seed:theme9 -- --tenant=marina-stanisavljevic-skincare-edukacija --dry-run
 *   npm run seed:theme9 -- --tenant=kiki-kiss-beauty --provision-theme9 --dry-run
 *   npm run seed:theme9 -- --tenant=marina-stanisavljevic-skincare-edukacija --force-reseed --dry-run
 *   npm run seed:theme9 -- --tenant=marina-stanisavljevic-skincare-edukacija --overwrite-shared
 *   npm run seed:theme9 -- --tenant=marina-stanisavljevic-skincare-edukacija --hero-eyebrow-only
 */
import mongoose from "mongoose";
import {
  SEEDABLE_TENANTS,
  salonShortDescription,
  sharedLandingSections,
  theme9LandingSections,
  themePages,
  bookingPreview,
  type SeedThemePage,
} from "./data/expert-editorial-content.mts";
import {
  planStarterProvisioning,
  theme9ProvisioningAllowed,
  type ProvisioningCandidate,
} from "./expert-editorial-provisioning.ts";

const MONGODB_URI = process.env.MONGODB_URI;
/**
 * Ime baze dolazi iz URI-ja. `dbName` opcija nadjacava connection string, pa se
 * prosledjuje samo kad je DB_NAME eksplicitno postavljen — inace bi skripta
 * uvek gadjala produkciju bez obzira na URI.
 */
const DB_NAME = process.env.DB_NAME;

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const OVERWRITE_SHARED = args.includes("--overwrite-shared");
const HERO_EYEBROW_ONLY = args.includes("--hero-eyebrow-only");
const FORCE_RESEED = args.includes("--force-reseed");
const EXPLICIT_THEME9_PROVISIONING = args.includes("--provision-theme9");
const tenantArg = args.find((a) => a.startsWith("--tenant="))?.split("=")[1];

if (HERO_EYEBROW_ONLY && (OVERWRITE_SHARED || FORCE_RESEED)) {
  console.error(
    "❌ --hero-eyebrow-only ne može sa --overwrite-shared/--force-reseed.",
  );
  process.exit(1);
}

if (!MONGODB_URI) {
  console.error(
    "❌ MONGODB_URI nije postavljen (koristi: --env-file=.env.local)",
  );
  process.exit(1);
}

const slugs = Object.keys(SEEDABLE_TENANTS);
if (!tenantArg || !slugs.includes(tenantArg)) {
  console.error("❌ Zadaj --tenant=<slug>. Dozvoljeni:");
  for (const [slug, why] of Object.entries(SEEDABLE_TENANTS)) {
    console.error(`   · ${slug}  (${why})`);
  }
  process.exit(1);
}

/** Minimalna validacija — seed ne sme da upiše polupraznu stranu. */
function validate(pages: Record<string, SeedThemePage>): string[] {
  const problems: string[] = [];
  const EXPECTED = ["za-klijente", "za-profesionalce"];

  for (const key of EXPECTED) {
    const page = pages[key];
    if (!page) {
      problems.push(`${key}: nedostaje`);
      continue;
    }
    if (!page.enabled) problems.push(`${key}: enabled je false`);
    if (!page.hero?.headline) problems.push(`${key}: hero.headline je prazan`);
    if (!page.faq?.items?.length) problems.push(`${key}: faq je prazan`);

    for (const item of page.cards?.items ?? []) {
      if (!item.title) problems.push(`${key}: kartica bez naslova`);
    }
    for (const item of page.steps?.items ?? []) {
      if (!item.title) problems.push(`${key}: korak bez naslova`);
    }
    for (const q of page.faq?.items ?? []) {
      if (!q.question || !q.answer)
        problems.push(`${key}: nepotpuno FAQ pitanje`);
    }
  }

  for (const key of Object.keys(pages)) {
    if (!EXPECTED.includes(key)) problems.push(`${key}: nepoznat ključ strane`);
  }

  for (const [name, section] of Object.entries(theme9LandingSections)) {
    if (!(section as { enabled?: boolean }).enabled) {
      problems.push(`landing.${name}: enabled je false`);
    }
  }

  return problems;
}

async function main() {
  const problems = validate(themePages);
  if (problems.length > 0) {
    console.error("❌ Sadržaj nije prošao validaciju:");
    for (const p of problems) console.error("   ·", p);
    process.exit(1);
  }
  console.log("✓ Validacija sadržaja prošla");

  await mongoose.connect(MONGODB_URI!, DB_NAME ? { dbName: DB_NAME } : {});
  const db = mongoose.connection.db!;

  const tenant = await db.collection("tenants").findOne({ slug: tenantArg });
  if (!tenant) {
    console.error(
      `❌ Tenant "${tenantArg}" nije pronađen — ništa nije upisano.`,
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const profile = await db
    .collection("salonprofiles")
    .findOne({ tenantId: tenant._id });
  if (!profile) {
    console.error("❌ SalonProfile za taj tenant nije pronađen.");
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`  tenant: ${tenantArg} · tema: ${profile.landingTheme ?? "—"}`);
  if (
    !theme9ProvisioningAllowed(
      profile.landingTheme,
      EXPLICIT_THEME9_PROVISIONING,
    )
  ) {
    console.error(
      "❌ Tenant nije na theme-9. Za namerno pre-provisioning pokreni ponovo " +
        "sa --provision-theme9 i zabeleži razlog u rollout evidenciji.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const currentAt = (path: string): unknown =>
    path
      .split(".")
      .reduce<unknown>(
        (value, key) => (value as Record<string, unknown> | undefined)?.[key],
        profile,
      );
  const candidate = (
    path: string,
    starter: unknown,
  ): ProvisioningCandidate => ({
    path,
    current: currentAt(path),
    starter,
  });

  const baseCandidates: ProvisioningCandidate[] = [];
  if (HERO_EYEBROW_ONLY) {
    baseCandidates.push(
      candidate(
        "landingStructure.landing.hero.eyebrow",
        sharedLandingSections.hero.eyebrow,
      ),
    );
  } else {
    baseCandidates.push(
      candidate("themePages", themePages),
      candidate("themeBookingPreview", bookingPreview),
    );
    for (const [name, section] of Object.entries(theme9LandingSections)) {
      baseCandidates.push(
        candidate(`landingStructure.landing.${name}`, section),
      );
    }
  }

  const plan = planStarterProvisioning(baseCandidates, {
    forceReseed: FORCE_RESEED || HERO_EYEBROW_ONLY,
  });

  if (OVERWRITE_SHARED) {
    const sharedCandidates = [
      candidate("shortDescription", salonShortDescription),
    ];
    for (const [name, section] of Object.entries(sharedLandingSections)) {
      sharedCandidates.push(
        candidate(`landingStructure.landing.${name}`, section),
      );
    }
    plan.push(
      ...planStarterProvisioning(sharedCandidates, { forceReseed: true }),
    );
  } else {
    console.log(
      "  hero/about/blog/shortDescription NISU dirani (dodaj --overwrite-shared).",
    );
  }

  console.log("  provisioning plan:");
  for (const decision of plan) {
    console.log(`   ${decision.action.padEnd(8)} ${decision.path}`);
    if (decision.action === "FORCE") {
      const before = JSON.stringify(decision.current ?? null);
      const after = JSON.stringify(decision.starter ?? null);
      console.log(
        `            pre: ${before.slice(0, 100)}${before.length > 100 ? "…" : ""}`,
      );
      console.log(
        `          posle: ${after.slice(0, 100)}${after.length > 100 ? "…" : ""}`,
      );
    }
  }

  const set = Object.fromEntries(
    plan
      .filter((decision) => decision.writes)
      .map((decision) => [decision.path, decision.starter]),
  );

  if (Object.keys(set).length === 0) {
    console.log("✓ NO-OP — nema polja za upis.");
    await mongoose.disconnect();
    return;
  }

  if (DRY_RUN) {
    console.log("— dry run — upisala bi se samo FILL/FORCE polja:");
    for (const path of Object.keys(set)) console.log("   ·", path);
    await mongoose.disconnect();
    return;
  }

  const res = await db
    .collection("salonprofiles")
    .updateOne({ _id: profile._id }, { $set: set });

  console.log(
    `✓ Upisano u SalonProfile ${profile._id} (matched=${res.matchedCount}, modified=${res.modifiedCount})`,
  );
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("❌ Seed nije uspeo:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
