/**
 * Seed: Expert Editorial (theme-9) demo sadržaj.
 *
 * IDEMPOTENTAN — ponovno pokretanje ne menja ništa ako je sadržaj već isti.
 * Privremeni mehanizam AUTORSTVA dok CMS editor ne stigne; kada stigne, piše u
 * ista polja i javno renderovanje se ne menja. Ništa se ne migrira.
 *
 * BEZBEDNOST:
 *   - allowlist tenanta (`SEEDABLE_TENANTS`) — pogrešan slug bi značio prepisan
 *     tuđi sajt;
 *   - podrazumevano piše SAMO nove theme-9 sekcije i `themePages`, što nijedna
 *     zatečena tema ne renderuje → upis ne može da promeni živ sajt;
 *   - `hero`/`about`/`stats`/`blog`/`description` dele se sa zatečenim temama i
 *     idu samo uz `--overwrite-shared`, uz ispis onoga što se gubi.
 *
 * Pokretanje (Node 24+, čita .env.local):
 *   npm run seed:theme9 -- --tenant=kiki-kiss-beauty --dry-run
 *   npm run seed:theme9 -- --tenant=kiki-kiss-beauty --overwrite-shared
 */
import mongoose from "mongoose";
import {
  SEEDABLE_TENANTS,
  salonDescription,
  sharedLandingSections,
  theme9LandingSections,
  themePages,
  type SeedThemePage,
} from "./data/expert-editorial-content.mts";

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "marysoll_db";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const OVERWRITE_SHARED = args.includes("--overwrite-shared");
const tenantArg = args.find((a) => a.startsWith("--tenant="))?.split("=")[1];

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI nije postavljen (koristi: --env-file=.env.local)");
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
      if (!q.question || !q.answer) problems.push(`${key}: nepotpuno FAQ pitanje`);
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

  await mongoose.connect(MONGODB_URI!, { dbName: DB_NAME });
  const db = mongoose.connection.db!;

  const tenant = await db.collection("tenants").findOne({ slug: tenantArg });
  if (!tenant) {
    console.error(`❌ Tenant "${tenantArg}" nije pronađen — ništa nije upisano.`);
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
  if (profile.landingTheme !== "theme-9") {
    console.log(
      "  ⚠ Tema još nije theme-9. Sadržaj se svejedno upisuje (nove sekcije\n" +
        "    nijedna zatečena tema ne renderuje), pa posle prebacivanja teme u\n" +
        "    admin panelu strana je odmah puna.",
    );
  }

  // ── Šta se upisuje ────────────────────────────────────────────────────────
  const set: Record<string, unknown> = { themePages };
  for (const [name, section] of Object.entries(theme9LandingSections)) {
    set[`landingStructure.landing.${name}`] = section;
  }

  if (OVERWRITE_SHARED) {
    const ls = (profile.landingStructure ?? {}) as {
      landing?: Record<string, unknown>;
    };
    console.log("  ⚠ --overwrite-shared: menja se i sadržaj koji vidi zatečena tema:");
    console.log(`     description: ${JSON.stringify(profile.description ?? "")}`);
    for (const key of ["hero", "about", "stats", "blog"]) {
      const before = JSON.stringify(ls.landing?.[key] ?? null);
      console.log(`     ${key}: ${before.slice(0, 90)}${before.length > 90 ? "…" : ""}`);
    }

    set.description = salonDescription;
    for (const [name, section] of Object.entries(sharedLandingSections)) {
      set[`landingStructure.landing.${name}`] = section;
    }
  } else {
    console.log(
      "  hero/about/stats/blog/description NISU dirani (dodaj --overwrite-shared).",
    );
  }

  const alreadySame = Object.entries(set).every(([path, value]) => {
    const current = path
      .split(".")
      .reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], profile);
    return JSON.stringify(current ?? null) === JSON.stringify(value);
  });

  if (alreadySame) {
    console.log("✓ Sadržaj je već identičan — nema izmena (idempotentno).");
    await mongoose.disconnect();
    return;
  }

  if (DRY_RUN) {
    console.log("— dry run — upisala bi se ova polja:");
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
