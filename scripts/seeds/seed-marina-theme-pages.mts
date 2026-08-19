/**
 * Seed: `SalonProfile.themePages` za Marinin tenant.
 *
 * Jednokratan i IDEMPOTENTAN — ponovno pokretanje ne menja ništa ako je sadržaj
 * već identičan. Privremeni mehanizam AUTORSTVA dok CMS editor ne stigne; kada
 * stigne, piše u isto polje i javno renderovanje se ne menja. Ništa se ne
 * migrira.
 *
 * Dodiruje ISKLJUČIVO tenant `marina-stanisavljevic-skincare-edukacija` i
 * odbija posao ako tema nije `theme-9`.
 *
 * Pokretanje (Node 24+, čita .env.local):
 *   npm run seed:marina-pages -- --dry-run
 *   npm run seed:marina-pages
 */
import mongoose from "mongoose";
import {
  MARINA_TENANT_SLUG,
  marinaThemePages,
  type SeedThemePage,
} from "./data/marina-theme-pages.mts";

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "marysoll_db";
const DRY_RUN = process.argv.includes("--dry-run");

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI nije postavljen (koristi: --env-file=.env.local)");
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

  return problems;
}

async function main() {
  const problems = validate(marinaThemePages);
  if (problems.length > 0) {
    console.error("❌ Sadržaj nije prošao validaciju:");
    for (const p of problems) console.error("   ·", p);
    process.exit(1);
  }
  console.log("✓ Validacija sadržaja prošla");

  await mongoose.connect(MONGODB_URI!, { dbName: DB_NAME });
  const db = mongoose.connection.db!;

  const tenant = await db
    .collection("tenants")
    .findOne({ slug: MARINA_TENANT_SLUG });

  if (!tenant) {
    console.error(`❌ Tenant "${MARINA_TENANT_SLUG}" nije pronađen — ništa nije upisano.`);
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

  if (profile.landingTheme !== "theme-9") {
    console.error(
      `❌ Tema je "${profile.landingTheme}", a ove strane postoje samo za theme-9.\n` +
        "   Prvo prebaci temu u admin panelu, pa pokreni seed ponovo.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const current = JSON.stringify(profile.themePages ?? null);
  const next = JSON.stringify(marinaThemePages);

  if (current === next) {
    console.log("✓ Sadržaj je već identičan — nema izmena (idempotentno).");
    await mongoose.disconnect();
    return;
  }

  if (DRY_RUN) {
    console.log("— dry run — upisalo bi se:");
    for (const [key, page] of Object.entries(marinaThemePages)) {
      console.log(
        `   ${key}: hero="${page.hero?.headline}" · kartica=${page.cards?.items.length ?? 0}` +
          ` · koraka=${page.steps?.items.length ?? 0} · faq=${page.faq?.items.length ?? 0}`,
      );
    }
    await mongoose.disconnect();
    return;
  }

  const res = await db
    .collection("salonprofiles")
    .updateOne({ _id: profile._id }, { $set: { themePages: marinaThemePages } });

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
