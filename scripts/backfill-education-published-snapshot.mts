/**
 * UI-2B — backfill javne verzije za zatečene objavljene EducationContent zapise.
 *
 * Do UI-2B je `status: "published"` značilo „root polja su javna“. Od UI-2B
 * javni izvor istine je `publishedSnapshot`, a zapis bez njega je namerno
 * nevidljiv (fail-closed). Zapisi objavljeni pre te promene zato dobijaju
 * polaznu javnu verziju iz svoje zatečene radne kopije — to je jedino stanje
 * koje je ikada bilo prikazano.
 *
 * Pravilo je u `src/lib/education/publishedSnapshotBackfill.ts` i tamo je
 * testirano; ova skripta je samo I/O oko njega.
 *
 *     published + nema snapshot  → snapshot iz zatečene radne kopije
 *     published + ima snapshot   → NE DIRA SE (idempotentno)
 *     draft                      → NE DIRA SE (nikad se ne objavljuje)
 *
 * Pokretanje (Node 24+, čita .env.local):
 *   npm run backfill:education-snapshot -- --dry-run
 *   npm run backfill:education-snapshot -- --dry-run --tenant=<tenantId>
 *   npm run backfill:education-snapshot -- --apply
 */
import mongoose from "mongoose";
import { classifyEducationRecord } from "../src/lib/education/publishedSnapshotBackfill.ts";

const MONGODB_URI = process.env.MONGODB_URI;
/** Vidi `src/lib/db/dbTarget.test.ts` — `dbName` se prosleđuje samo eksplicitno. */
const DB_NAME = process.env.DB_NAME;

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const TENANT = args.find((a) => a.startsWith("--tenant="))?.split("=")[1];

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI nije postavljen.");
  process.exit(1);
}

await mongoose.connect(MONGODB_URI, DB_NAME ? { dbName: DB_NAME } : {});
const db = mongoose.connection.db;
if (!db) {
  console.error("❌ Nema DB konekcije.");
  process.exit(1);
}

console.log(`baza: ${db.databaseName}`);
console.log(`režim: ${APPLY ? "APPLY" : "DRY-RUN"}${TENANT ? ` · tenant=${TENANT}` : ""}`);

const collections = await db.listCollections({ name: "educationcontents" }).toArray();
if (collections.length === 0) {
  console.log("kolekcija `educationcontents` ne postoji — nema šta da se migrira.");
  await mongoose.disconnect();
  process.exit(0);
}

const filter: Record<string, unknown> = { status: "published" };
if (TENANT) filter.tenantId = new mongoose.Types.ObjectId(TENANT);

const collection = db.collection("educationcontents");
const records = await collection.find(filter).toArray();

let backfilled = 0;
let skipped = 0;

for (const record of records) {
  const decision = classifyEducationRecord(record as Record<string, unknown>);

  if (decision.kind === "skip") {
    skipped += 1;
    console.log(`· skip  ${record._id} (${decision.reason})`);
    continue;
  }

  backfilled += 1;
  console.log(
    `→ snapshot ${record._id} · slug=${decision.snapshot.slug} · ` +
      `visibility=${decision.snapshot.visibility} · ` +
      `blokova=${decision.snapshot.blocks.length}`,
  );

  if (APPLY) {
    await collection.updateOne(
      { _id: record._id, publishedSnapshot: { $exists: false } },
      { $set: { publishedSnapshot: decision.snapshot } },
    );
  }
}

console.log(
  `\nobjavljenih zapisa: ${records.length} · za backfill: ${backfilled} · preskočeno: ${skipped}`,
);
if (!APPLY && backfilled > 0) {
  console.log("dry-run — ništa nije upisano. Pokreni ponovo sa `--apply`.");
}

await mongoose.disconnect();
