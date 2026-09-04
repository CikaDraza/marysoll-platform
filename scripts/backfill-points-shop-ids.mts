/**
 * Stabilan identitet points-shop ponuda (T1-4).
 *
 * Do T1-4 je `LoyaltyConfig.pointsShop` bio niz bez `_id` i bez ijednog
 * identiteta — postojao je samo indeks u nizu. Redemption po indeksu je
 * neprihvatljiv: promena redosleda ili brisanje jedne ponude pomerila bi
 * značenje svakog zahteva u letu, pa bi klijentkinja platila jednu nagradu a
 * dobila drugu.
 *
 * Ovaj alat SAMO dopisuje `id` zatečenim stavkama. Ne menja cenu, nagradu, rok
 * ni redosled, i ne dira stavku koja id već ima — pa je drugo pokretanje uvek
 * 0 kandidata.
 *
 * Napomena o zatečenom stanju: do T1-4 nije postojao nijedan editor koji piše
 * points-shop ponude (Growth Studio ih nije imao), pa se očekuje prazan
 * rezultat. Alat postoji da bi se to DOKAZALO nad stvarnom bazom, a ne
 * pretpostavilo — i da bi ručno unete stavke, ako ih ima, dobile identitet
 * umesto da tiho nestanu iz ponude.
 *
 *   npm run backfill:points-shop-ids -- --dry-run
 *   npm run backfill:points-shop-ids -- --apply
 *   npm run backfill:points-shop-ids -- --apply --tenant=<tenantId>
 */
import mongoose from "mongoose";
import crypto from "crypto";

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const TENANT = args.find((a) => a.startsWith("--tenant="))?.split("=")[1];

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI nije postavljen.");
  process.exit(1);
}
if (!APPLY && !args.includes("--dry-run")) {
  console.error("❌ Navedite --dry-run ili --apply.");
  process.exit(1);
}

/** Isti oblik id-a kao `src/lib/loyalty/pointsShopIdentity.ts`. */
function newOfferId(): string {
  return `psh_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

await mongoose.connect(MONGODB_URI, DB_NAME ? { dbName: DB_NAME } : {});
const db = mongoose.connection.db;
if (!db) {
  console.error("❌ Nema konekcije na bazu.");
  process.exit(1);
}

const tenants = Object.fromEntries(
  (await db.collection("tenants").find({}, { projection: { slug: 1 } }).toArray())
    .map((t) => [String(t._id), String(t.slug ?? "?")]),
);

const query: Record<string, unknown> = {
  pointsShop: { $elemMatch: { id: { $in: [null, ""] } } },
};
// `$exists: false` i prazan string su isti slučaj: stavka bez identiteta.
const missingIdQuery: Record<string, unknown> = {
  $or: [
    { pointsShop: { $elemMatch: { id: { $exists: false } } } },
    query,
  ],
};
if (TENANT) missingIdQuery.tenantId = new mongoose.Types.ObjectId(TENANT);

interface ShopItem {
  id?: string | null;
  costPoints?: number;
  reward?: { type?: string; value?: number };
}

const configs = await db
  .collection("loyaltyconfigs")
  .find(missingIdQuery)
  .toArray();

let plannedItems = 0;
const plan: Array<{
  _id: mongoose.Types.ObjectId;
  slug: string;
  pointsShop: ShopItem[];
}> = [];

for (const config of configs) {
  const items = (config.pointsShop ?? []) as ShopItem[];
  const slug = tenants[String(config.tenantId)] ?? String(config.tenantId);
  const next = items.map((item) => {
    if (item.id) return item;
    plannedItems += 1;
    const id = newOfferId();
    console.log(
      `${slug} — ponuda ${item.costPoints ?? "?"} poena / ${item.reward?.type ?? "?"} ${item.reward?.value ?? ""} → ${id}`,
    );
    return { ...item, id };
  });
  plan.push({ _id: config._id as mongoose.Types.ObjectId, slug, pointsShop: next });
}

if (APPLY && plannedItems > 0) {
  let updated = 0;
  for (const entry of plan) {
    const res = await db
      .collection("loyaltyconfigs")
      .updateOne(
        { _id: entry._id },
        { $set: { pointsShop: entry.pointsShop } },
      );
    updated += res.modifiedCount;
  }
  console.log(`\n✅ Ažurirano konfiguracija: ${updated} (${plannedItems} ponuda)`);
} else {
  console.log(
    `\n${
      plannedItems === 0
        ? "Nema šta da se migrira — nijedna points-shop ponuda nije bez id-a."
        : `Za migraciju: ${plannedItems} ponuda u ${plan.length} salona. Pokrenite sa --apply.`
    }`,
  );
}

await mongoose.disconnect();
