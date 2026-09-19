/**
 * One-off migration: fix the `tenants.customDomain` unique index.
 *
 * The old index (`unique` + `sparse`) collides on the explicit `null` that
 * every tenant without its own domain stores, breaking tenant registration with:
 *   E11000 duplicate key error ... index: customDomain_1 dup key: { customDomain: null }
 *
 * `sparse` only skips documents where the field is ABSENT, not where it is
 * null. This drops any existing index on { customDomain: 1 } and recreates it
 * as a PARTIAL unique index that only covers real (string) domains.
 *
 * SAFETY GUARD: this project has already shipped once with a `dbName` option
 * silently overriding the database from the connection string, so staging
 * ran against the production database for a while (fixed 2026-08-27). A DB
 * migration script must never trust MONGODB_URI/DB_NAME alone — the caller
 * states which database they intend to touch (EXPECTED_DB_NAME), and the
 * script refuses to run if the actual connection doesn't match.
 *
 * Idempotent. Run against each environment (Node 20+):
 *   EXPECTED_DB_NAME=staging-marysoll_db \
 *     node --env-file=.env.local scripts/fix-tenant-custom-domain-index.mjs
 */
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
/**
 * Ime baze dolazi iz URI-ja. `dbName` opcija nadjacava connection string, pa se
 * prosledjuje samo kad je DB_NAME eksplicitno postavljen — inace bi skripta
 * uvek gadjala produkciju bez obzira na URI.
 */
const DB_NAME = process.env.DB_NAME;
const EXPECTED_DB_NAME = process.env.EXPECTED_DB_NAME;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set (use: node --env-file=.env.local ...)");
  process.exit(1);
}

if (!EXPECTED_DB_NAME) {
  console.error(
    "❌ EXPECTED_DB_NAME is not set.\n" +
      "   Ova skripta ne pogađa okruženje sama iz MONGODB_URI/DB_NAME — " +
      "eksplicitno navedite ime baze koju očekujete, npr.:\n" +
      "   EXPECTED_DB_NAME=staging-marysoll_db node --env-file=.env.local scripts/fix-tenant-custom-domain-index.mjs",
  );
  process.exit(1);
}

const KEY = "customDomain";
const DESIRED_NAME = "customDomain_1";
const DESIRED_OPTIONS = {
  unique: true,
  name: DESIRED_NAME,
  partialFilterExpression: { [KEY]: { $type: "string" } },
};

function isTargetKey(index) {
  const keys = Object.keys(index.key ?? {});
  return keys.length === 1 && keys[0] === KEY;
}

function isAlreadyCorrect(index) {
  return (
    index.unique === true &&
    index.partialFilterExpression &&
    JSON.stringify(index.partialFilterExpression) ===
      JSON.stringify(DESIRED_OPTIONS.partialFilterExpression)
  );
}

async function main() {
  await mongoose.connect(MONGODB_URI, DB_NAME ? { dbName: DB_NAME } : {});

  const actualDbName = mongoose.connection.name;
  if (actualDbName !== EXPECTED_DB_NAME) {
    console.error(
      `❌ Povezano na bazu "${actualDbName}", a očekivano je "${EXPECTED_DB_NAME}". ` +
        "Prekidam bez izmena — proverite MONGODB_URI/DB_NAME pre ponovnog pokretanja.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(`✓ Povezano na očekivanu bazu: ${actualDbName}`);

  const coll = mongoose.connection.collection("tenants");

  const indexes = await coll.indexes();
  console.log(
    "Current indexes on tenants:",
    indexes.map((i) => i.name),
  );

  const target = indexes.filter(isTargetKey);

  if (target.some(isAlreadyCorrect)) {
    console.log("✓ Partial unique index already present — nothing to do.");
  } else {
    for (const idx of target) {
      console.log(`Dropping stale index "${idx.name}" ...`);
      await coll.dropIndex(idx.name);
    }
    console.log("Creating partial unique index ...");
    await coll.createIndex({ [KEY]: 1 }, DESIRED_OPTIONS);
    console.log("✓ Created", DESIRED_NAME, "with", JSON.stringify(DESIRED_OPTIONS.partialFilterExpression));
  }

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch(async (err) => {
  console.error("❌ Migration failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
