/**
 * Uklanja ZAOSTALE `services[]` stavke sa usluga koje NISU paket.
 *
 * Kad se usluga u adminu prebaci sa `group` na `variant`, Mongo zadržava stari
 * `services[]` niz. Prikaz ga ne čita (cenovnik i widget renderuju stavke samo
 * za `type: "group"`), pa je to mrtav podatak — ali zbunjuje svakoga ko gleda
 * dokument i lako navede na pogrešan zaključak o konfiguraciji.
 *
 * Primer zatečen 2026-09-02: „Izlivanje nokta" (marysoll) je ispravno
 * `variant` + `from` + basePrice 2000, ali nosi četiri stavke iz vremena kad
 * je bio paket.
 *
 * NE dira:
 *   - usluge tipa `group` — tamo je `services[]` živ sadržaj;
 *   - bilo šta osim tog niza.
 *
 * Idempotentno; pokretanje dvaput je bezbedno.
 *
 *   npm run cleanup:stale-group-items -- --dry-run
 *   npm run cleanup:stale-group-items -- --apply
 *   npm run cleanup:stale-group-items -- --apply --tenant=<tenantId>
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
if (!APPLY && !args.includes("--dry-run")) {
  console.error("❌ Navedite --dry-run ili --apply.");
  process.exit(1);
}

await mongoose.connect(MONGODB_URI, DB_NAME ? { dbName: DB_NAME } : {});
const db = mongoose.connection.db;
if (!db) {
  console.error("❌ Nema konekcije na bazu.");
  process.exit(1);
}

const query: Record<string, unknown> = {
  type: { $ne: "group" },
  "services.0": { $exists: true },
};
if (TENANT) query.tenantId = new mongoose.Types.ObjectId(TENANT);

const affected = await db.collection("services").find(query).toArray();

for (const service of affected) {
  const count = Array.isArray(service.services) ? service.services.length : 0;
  console.log(
    `${APPLY ? "→" : "(dry)"} ${String(service.name)} [${String(service.type)}] — uklanjam ${count} zaostalih stavki`,
  );
  if (APPLY) {
    await db
      .collection("services")
      .updateOne({ _id: service._id }, { $set: { services: [] } });
  }
}

console.log(
  `\n${APPLY ? "Očišćeno" : "Za čišćenje"}: ${affected.length} usluga.`,
);

await mongoose.disconnect();
