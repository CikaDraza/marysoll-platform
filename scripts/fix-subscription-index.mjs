/**
 * One-off migration: fix the `subscriptions.paddleSubscriptionId` unique index.
 *
 * The old index (plain or `sparse` unique) collides on the explicit `null` that
 * every internal/trial subscription stores, breaking tenant registration with:
 *   E11000 duplicate key error ... paddleSubscriptionId: null
 *
 * This drops any existing index on { paddleSubscriptionId: 1 } and recreates it
 * as a PARTIAL unique index that only covers real (string) Paddle ids, so any
 * number of null/trial subscriptions can coexist.
 *
 * Run (Node 20+, reads .env.local for MONGODB_URI / DB_NAME):
 *   node --env-file=.env.local scripts/fix-subscription-index.mjs
 */
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
/**
 * Ime baze dolazi iz URI-ja. `dbName` opcija nadjacava connection string, pa se
 * prosledjuje samo kad je DB_NAME eksplicitno postavljen — inace bi skripta
 * uvek gadjala produkciju bez obzira na URI.
 */
const DB_NAME = process.env.DB_NAME;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set (use: node --env-file=.env.local ...)");
  process.exit(1);
}

const KEY = "paddleSubscriptionId";
const DESIRED_NAME = "paddleSubscriptionId_1";
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
  const coll = mongoose.connection.collection("subscriptions");

  const indexes = await coll.indexes();
  console.log(
    "Current indexes on subscriptions:",
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
