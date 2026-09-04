/**
 * Legacy „zahtev za uslugu" iz KATEGORIJE u eksplicitnu konfiguraciju USLUGE.
 *
 * Do 2026-09-02 je odluku nosila platformska kategorija
 * (`CATEGORY_MAP.nails.requiresIntake = true`). Vlasnik je sada usluga:
 * `service.bookingIntake.enabled`.
 *
 * Bez ove migracije bi prelazak na novi authority TIHO UGASIO zahtev svim
 * postojećim uslugama noktiju — klijentkinje bi prestale da šalju fotografije,
 * a salon ne bi znao zašto.
 *
 * Ovo NIJE budući hardkod. Jednokratno materijalizuje staru implicitnu odluku;
 * posle njega `CATEGORY_MAP.requiresIntake` više ne utiče na booking.
 *
 * Ne dira usluge koje već imaju `bookingIntake.enabled` postavljen — idempotentno.
 *
 *   npm run backfill:service-intake -- --dry-run
 *   npm run backfill:service-intake -- --apply
 *   npm run backfill:service-intake -- --apply --tenant=<tenantId>
 */
import mongoose from "mongoose";
import { CATEGORY_MAP } from "../src/lib/categoryMap.ts";

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

/** Kategorije koje su po STAROJ politici tražile zahtev. */
const legacyIntakeSlugs = Object.entries(CATEGORY_MAP)
  .filter(([, cat]) => cat.requiresIntake)
  .map(([key]) => key);

console.log(`Legacy kategorije sa zahtevom: ${legacyIntakeSlugs.join(", ")}\n`);

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

/**
 * Bira SAMO dokumente kod kojih nova odluka još ne postoji.
 *
 * `$ne: true` bi hvatao i `enabled: false`, pa bi salon koji je NAMERNO
 * odštiklirao „Traži da klijentkinja pošalje šta želi" sledećim backfillom
 * dobio `true` nazad. Legacy migracija sme da materijalizuje samo nepostojeću
 * odluku, nikad da pregazi donetu.
 *
 *   nema polja → backfill sme da postavi true
 *   false      → eksplicitna odluka admina, NE DIRA SE
 *   true       → već uključeno, NE DIRA SE
 */
const query: Record<string, unknown> = {
  categorySlug: { $in: legacyIntakeSlugs },
  "bookingIntake.enabled": { $exists: false },
};
if (TENANT) query.tenantId = new mongoose.Types.ObjectId(TENANT);

const services = await db.collection("services").find(query).toArray();

const byTenant = new Map<string, string[]>();
for (const service of services) {
  const slug = tenants[String(service.tenantId)] ?? String(service.tenantId);
  if (!byTenant.has(slug)) byTenant.set(slug, []);
  byTenant.get(slug)!.push(String(service.name));
}

for (const [slug, names] of byTenant) {
  console.log(`${slug} — ${names.length} usluga:`);
  for (const name of names) console.log(`    ${name}`);
}

if (APPLY && services.length > 0) {
  const res = await db
    .collection("services")
    .updateMany(query, { $set: { "bookingIntake.enabled": true } });
  console.log(`\n✅ Ažurirano: ${res.modifiedCount}`);
} else {
  console.log(
    `\n${services.length === 0 ? "Nema šta da se migrira." : `Za migraciju: ${services.length} usluga u ${byTenant.size} salona. Pokrenite sa --apply.`}`,
  );
}

await mongoose.disconnect();
