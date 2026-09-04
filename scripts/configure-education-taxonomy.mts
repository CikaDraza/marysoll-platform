/**
 * Attach an Education-domain taxonomy preset to one explicit tenant.
 *
 * Dry-run is the default. No content or published snapshot is rewritten.
 *
 *   npm run configure:education-taxonomy -- --tenant=<slug>
 *   npm run configure:education-taxonomy -- --tenant=<slug> --preset=skincare --apply
 */
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const TENANT = args.find((arg) => arg.startsWith("--tenant="))?.split("=")[1];
const PRESET =
  args.find((arg) => arg.startsWith("--preset="))?.split("=")[1] ?? "skincare";

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI nije postavljen.");
  process.exit(1);
}
if (!TENANT) {
  console.error("❌ Obavezan je eksplicitan --tenant=<slug>.");
  process.exit(1);
}
if (PRESET !== "skincare") {
  console.error(`❌ Nepodržan Education taxonomy preset: ${PRESET}`);
  process.exit(1);
}

await mongoose.connect(MONGODB_URI, DB_NAME ? { dbName: DB_NAME } : {});
const db = mongoose.connection.db;
if (!db) {
  console.error("❌ Nema DB konekcije.");
  process.exit(1);
}

const tenant = await db.collection("tenants").findOne(
  { slug: TENANT },
  { projection: { slug: 1, educationTaxonomyPreset: 1 } },
);
if (!tenant) {
  console.error(`❌ Tenant "${TENANT}" nije pronađen u bazi ${db.databaseName}.`);
  await mongoose.disconnect();
  process.exit(1);
}

const current = tenant.educationTaxonomyPreset;
console.log(`baza: ${db.databaseName}`);
console.log(`tenant: ${tenant.slug} (${tenant._id})`);
console.log(`režim: ${APPLY ? "APPLY" : "DRY-RUN"}`);
console.log(`educationTaxonomyPreset: ${String(current ?? "<nije podešen>")} → ${PRESET}`);

if (current === PRESET) {
  console.log("bez izmene — preset je već podešen (idempotentno).");
} else if (APPLY) {
  const result = await db.collection("tenants").updateOne(
    { _id: tenant._id },
    { $set: { educationTaxonomyPreset: PRESET } },
  );
  console.log(`izmenjenih tenant-a: ${result.modifiedCount}`);
} else {
  console.log("dry-run — ništa nije upisano. Dodajte --apply za eksplicitnu izmenu.");
}

await mongoose.disconnect();
