/**
 * UI-3B — prelazak sa dvočlanog `visibility` na trostepeni `accessMode`.
 *
 * Do sada je Education sadržaj imao `public | private`. Od sada ima
 * `public | gated | private`, gde je `gated` javno otkriven a telo zaključano.
 * Zatečeni zapisi nemaju novo polje, pa ga ova skripta dodaje — i na radnoj
 * kopiji i na objavljenoj verziji.
 *
 * Preslikavanje je fail-closed: samo eksplicitno „public" postaje javno.
 *
 *     visibility: "public"    → accessMode: "public"
 *     sve ostalo / nedostaje  → accessMode: "private"
 *     accessMode već postoji  → NE DIRA SE (idempotentno)
 *
 * Nijedan zapis ne postaje javniji nego što je bio, i nijedan draft se ne
 * objavljuje. Čitanje je i bez ove skripte bezbedno — `resolveAccessMode()`
 * radi isto preslikavanje u letu — ali upiti nad `accessMode` su brži i jasniji
 * kada polje stvarno postoji.
 *
 * Pokretanje (Node 24+, čita .env.local):
 *   npm run backfill:education-access -- --dry-run
 *   npm run backfill:education-access -- --apply
 */
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
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

const filter: Record<string, unknown> = {};
if (TENANT) filter.tenantId = new mongoose.Types.ObjectId(TENANT);

const collection = db.collection("educationcontents");
const records = await collection.find(filter).toArray();

const mode = (value: unknown) => (value === "public" ? "public" : "private");

let changed = 0;
let skipped = 0;

for (const record of records) {
  const needsRoot = typeof record.accessMode !== "string";
  const snapshot = record.publishedSnapshot as Record<string, unknown> | null;
  const needsSnapshot = Boolean(snapshot) && typeof snapshot?.accessMode !== "string";

  if (!needsRoot && !needsSnapshot) {
    skipped += 1;
    continue;
  }

  const updates: Record<string, string> = {};
  if (needsRoot) updates.accessMode = mode(record.visibility);
  if (needsSnapshot) {
    updates["publishedSnapshot.accessMode"] = mode(snapshot?.visibility);
  }

  changed += 1;
  console.log(
    `→ ${record._id} · ${Object.entries(updates)
      .map(([key, value]) => `${key}=${value}`)
      .join(" · ")}`,
  );

  if (APPLY) await collection.updateOne({ _id: record._id }, { $set: updates });
}

console.log(`\nzapisa: ${records.length} · izmenjeno: ${changed} · preskočeno: ${skipped}`);
if (!APPLY && changed > 0) {
  console.log("dry-run — ništa nije upisano. Pokreni ponovo sa `--apply`.");
}

await mongoose.disconnect();
