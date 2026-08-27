/**
 * 2B.1 — normalizacija zatečenog implicitnog `enabled: false`.
 *
 * Uklanjanje `default: false` iz šeme (2B.0) NE briše već upisane vrednosti iz
 * Mongo-a. Ova skripta klasifikuje zatečeno stanje i, samo uz `--apply`, skida
 * `enabled` sa sekcija gde je on očigledno legacy default, a ne odluka vlasnice.
 *
 * Pravilo je u `src/lib/theme9/sectionNormalization.ts` i tamo je testirano —
 * ova skripta je samo I/O oko njega.
 *
 *     false + nema meaningful sadržaja  → kandidat za $unset
 *     false + ima meaningful sadržaj    → NE DIRA SE, ide u report
 *     true                              → NE DIRA SE
 *     odsutno                           → NE DIRA SE
 *
 * ⚠ RELEASE GATE (2B.0d)
 * `--apply` sme tek kada je tri-state šema DEPLOY-OVANA na produkciju. Dok
 * produkcija radi staru šemu sa `default: false`, Mongoose ponovo materijalizuje
 * `enabled: false` pri prvom sledećem snimanju profila i migracija je tiho
 * poništena. Zato `--apply` traži i eksplicitno `--schema-deployed`.
 *
 * Pokretanje (Node 24+, čita .env.local):
 *   npm run normalize:theme9 -- --dry-run
 *   npm run normalize:theme9 -- --dry-run --tenant=marina-stanisavljevic-skincare-edukacija
 *   npm run normalize:theme9 -- --apply --schema-deployed
 *
 * GENERALNA PROBA (samo staging):
 *   npm run normalize:theme9 -- --seed-legacy-state
 */
import mongoose from "mongoose";
import {
  classifyProfile,
  type SectionDecision,
} from "../src/lib/theme9/sectionNormalization.ts";

const MONGODB_URI = process.env.MONGODB_URI;
/**
 * Ime baze dolazi iz URI-ja. `dbName` opcija nadjacava connection string, pa se
 * prosledjuje samo kad je DB_NAME eksplicitno postavljen — inace bi ova skripta
 * uvek gadjala produkciju bez obzira na URI. Vidi `src/lib/db/dbTarget.test.ts`.
 */
const DB_NAME = process.env.DB_NAME;

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const SCHEMA_DEPLOYED = args.includes("--schema-deployed");
const SEED_LEGACY = args.includes("--seed-legacy-state");
const TENANT = args.find((a) => a.startsWith("--tenant="))?.split("=")[1];

if (SEED_LEGACY && APPLY) {
  console.error(
    "❌ `--seed-legacy-state` i `--apply` ne mogu zajedno — to bi napravilo i\n" +
      "   odmah obrisalo isto stanje, pa proba ne bi nista dokazala.",
  );
  process.exit(1);
}

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI nije postavljen.");
  process.exit(1);
}

if (APPLY && !SCHEMA_DEPLOYED) {
  console.error(
    [
      "❌ `--apply` je odbijen: nedostaje `--schema-deployed`.",
      "",
      "   RELEASE GATE 2B.0d — dok produkcija radi staru šemu sa",
      "   `default: false`, Mongoose ponovo upisuje `enabled: false` pri prvom",
      "   sledećem snimanju profila i ova migracija je tiho poništena.",
      "",
      "   Prvo deploy tri-state šeme, pa tek onda:",
      "     npm run normalize:theme9 -- --apply --schema-deployed",
    ].join("\n"),
  );
  process.exit(1);
}

const DECISION_LABEL: Record<SectionDecision, string> = {
  unset_candidate: "KANDIDAT ZA $unset",
  review_has_content: "ne diraj — ima sadržaj",
  keep_enabled: "ne diraj — uključeno",
  already_absent: "ne diraj — već čisto",
  section_missing: "ne diraj — nema sekcije",
};

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + " ".repeat(width - value.length);
}

/**
 * PROBA — namerno pravi zateceno stanje koje migracija treba da ocisti.
 *
 * Postoji zato sto na trenutnim podacima migracija nema sta da radi: Mongoose
 * default se materijalizovao pri KREIRANJU dokumenta, a nijedan profil nije
 * nastao otkad je sema imala `default: false`. Bez ovoga bi generalna proba
 * dokazala samo da cev radi, ne i da `$unset` grana radi — a to bi se prvi put
 * izvrsilo tek nad stvarnim produkcijskim podacima.
 *
 * Seed-uju se DVA slucaja, da se dokaze i sta se cisti i sta se NE dira:
 *
 *   audiencePaths  enabled:false, bez sadrzaja  -> mora postati kandidat
 *   topicHub       enabled:false, SA sadrzajem  -> mora ostati netaknut
 *
 * Reverzibilno jednom komandom: `npm run copy:tenants -- --apply` vraca staging
 * na vernu kopiju produkcije.
 */
async function seedLegacyState(
  db: NonNullable<typeof mongoose.connection.db>,
  connectedDb: string,
): Promise<void> {
  // ── Tvrda granica: ovaj alat NIKAD ne sme na produkciju ──────────────────
  // Provera se izvodi iz STVARNO spojene baze, ne iz zastavice koju neko moze
  // proslediti iz navike. Dva nezavisna uslova.
  const looksStaging = /staging/i.test(connectedDb);
  const looksProduction = connectedDb === "marysoll_db";

  if (!looksStaging || looksProduction) {
    console.error(
      [
        `❌ \`--seed-legacy-state\` je odbijen. Spojena baza: \`${connectedDb}\`.`,
        "",
        "   Ovaj alat NAMERNO upisuje neispravno stanje i sme samo na staging.",
        "   Ime baze mora sadrzati „staging\" i ne sme biti `marysoll_db`.",
      ].join("\n"),
    );
    process.exit(1);
  }

  const slug = TENANT ?? "the-lash-room-by-anja";
  const tenant = await db.collection("tenants").findOne({ slug });
  if (!tenant) {
    console.error(`❌ Tenant "${slug}" nije pronadjen u \`${connectedDb}\`.`);
    process.exit(1);
  }

  const set = {
    // Prazna sekcija sa odlukom `false` — tacno oblik koji je stara sema
    // materijalizovala. Migracija ovo mora prepoznati kao kandidat.
    "landingStructure.landing.audiencePaths": { enabled: false, paths: [] },
    // Ista odluka, ali sa autorskim sadrzajem — migracija ovo NE SME da dira.
    "landingStructure.landing.topicHub": {
      enabled: false,
      headline: "Zatecen naslov koji se ne sme izgubiti",
      filters: [],
      topics: [],
    },
  };

  const res = await db
    .collection("salonprofiles")
    .updateOne({ tenantId: tenant._id }, { $set: set });

  console.log(
    [
      `\nSEED · baza: ${connectedDb} · tenant: ${slug}`,
      `  izmenjenih profila: ${res.modifiedCount}`,
      "",
      "  audiencePaths  enabled:false, bez sadrzaja  → ocekuje se KANDIDAT",
      "  topicHub       enabled:false, SA sadrzajem  → ocekuje se „ne diraj\"",
      "",
      "  Sledece:",
      "    npm run normalize:theme9 -- --dry-run",
      "    npm run normalize:theme9 -- --apply --schema-deployed",
      "    npm run normalize:theme9 -- --dry-run      (kandidata mora biti 0)",
      "",
      "  Vracanje staging-a na vernu kopiju produkcije:",
      "    npm run copy:tenants -- --apply\n",
    ].join("\n"),
  );
}

async function main(): Promise<void> {
  await mongoose.connect(MONGODB_URI!, DB_NAME ? { dbName: DB_NAME } : {});
  const db = mongoose.connection.db!;

  const tenantFilter: Record<string, unknown> = {};
  if (TENANT) {
    const tenant = await db.collection("tenants").findOne({ slug: TENANT });
    if (!tenant) {
      console.error(`❌ Tenant "${TENANT}" nije pronađen — ništa nije dirano.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    tenantFilter.tenantId = tenant._id;
  }

  const profiles = await db
    .collection("salonprofiles")
    .find(tenantFilter)
    .toArray();

  // tenantId → slug, samo za čitljiv izveštaj
  const tenants = await db
    .collection("tenants")
    .find({}, { projection: { slug: 1 } })
    .toArray();
  const slugById = new Map(tenants.map((t) => [String(t._id), t.slug as string]));

  // STVARNA baza posle connect-a, ne ono sto smo trazili. Operater ovo mora
  // videti pre nego sto odobri `--apply`.
  const connectedDb = mongoose.connection.name;

  if (SEED_LEGACY) {
    await seedLegacyState(db, connectedDb);
    await mongoose.disconnect();
    return;
  }

  console.log(
    `\n${APPLY ? "APPLY" : "DRY-RUN"} · baza: ${connectedDb} · ${profiles.length} profil(a)${
      TENANT ? ` · tenant=${TENANT}` : " · svi tenanti"
    }\n`,
  );
  console.log(
    `  ${pad("TENANT", 44)}${pad("TEMA", 10)}${pad("SEKCIJA", 20)}${pad("ENABLED", 9)}${pad("SADRŽAJ", 9)}ODLUKA`,
  );
  console.log(`  ${"─".repeat(110)}`);

  const totals: Record<SectionDecision, number> = {
    unset_candidate: 0,
    review_has_content: 0,
    keep_enabled: 0,
    already_absent: 0,
    section_missing: 0,
  };
  let profilesTouched = 0;
  let pathsUnset = 0;

  for (const profile of profiles) {
    const slug = slugById.get(String(profile.tenantId)) ?? "(bez tenanta)";
    const result = classifyProfile(profile);

    for (const s of result.sections) {
      totals[s.decision] += 1;
      // Nezanimljive redove ne ispisujemo — izveštaj bi bio nečitljiv.
      if (s.decision === "section_missing" || s.decision === "already_absent") {
        continue;
      }
      console.log(
        `  ${pad(slug, 44)}${pad(result.theme ?? "—", 10)}${pad(s.section, 20)}` +
          `${pad(String(s.enabled), 9)}${pad(s.meaningfulContent ? "da" : "ne", 9)}` +
          DECISION_LABEL[s.decision],
      );
    }

    if (APPLY && result.unsetPaths.length > 0) {
      const unset = Object.fromEntries(result.unsetPaths.map((p) => [p, ""]));
      await db
        .collection("salonprofiles")
        .updateOne({ _id: profile._id }, { $unset: unset });
      profilesTouched += 1;
      pathsUnset += result.unsetPaths.length;
    }
  }

  console.log(`\n  ZBIR`);
  for (const [decision, count] of Object.entries(totals)) {
    if (count === 0) continue;
    console.log(
      `    ${pad(DECISION_LABEL[decision as SectionDecision], 26)}${count}`,
    );
  }

  if (APPLY) {
    console.log(
      `\n  ✅ Primenjeno u bazi \`${connectedDb}\`: ${pathsUnset} \`enabled\` polja skinuto sa ${profilesTouched} profila.`,
    );
    console.log(
      `     Ponovi sa \`--dry-run\` — „KANDIDAT ZA \$unset\" mora biti 0.`,
    );
  } else if (totals.unset_candidate > 0) {
    console.log(
      `\n  Ništa nije promenjeno. Za primenu (tek posle deploy-a tri-state šeme):`,
    );
    console.log(`     npm run normalize:theme9 -- --apply --schema-deployed`);
  } else {
    console.log(`\n  Nema kandidata — stanje je već normalizovano.`);
  }

  if (totals.review_has_content > 0) {
    console.log(
      `\n  ⚠ ${totals.review_has_content} sekcija ima \`enabled: false\` UZ sadržaj.` +
        `\n    Te se ne diraju automatski — moguća je stvarna odluka vlasnice.` +
        `\n    Proveriti ručno pre nego što se bilo šta menja.`,
    );
  }

  console.log("");
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("❌ Greška:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
