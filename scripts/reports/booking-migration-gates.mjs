/**
 * READ-ONLY provera dva preostala 6B gate-a. Ne piše NIŠTA.
 *
 * 1. TRANSACTION CAPABILITY — Booking core radi kroz `session.withTransaction`.
 *    Mongo transakcije traže replica set ili sharded cluster; na standalone
 *    deployment-u svaki `reserve()` bi pukao. Ovo je hard release gate iz
 *    T3 §21.1 i mora biti dokazan PRE cutover-a, ne posle.
 *
 * 2. MARKETPLACE SLOT USAGE — T3 §3.1 vodi četiri Slot write ulaza kao
 *    paralelni occupancy autoritet. Pre odluke (migrirati / ugasiti / svesti na
 *    izveden prikaz) treba znati da li se uopšte koriste.
 *
 * Run:
 *   node --env-file=.env.local scripts/reports/booking-migration-gates.mjs
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
  console.error("MONGODB_URI nije postavljen (probaj --env-file=.env.local).");
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGODB_URI, DB_NAME ? { dbName: DB_NAME } : {});
  const admin = mongoose.connection.db.admin();
  const hello = await admin.command({ hello: 1 });

  const isReplicaSet = Boolean(hello.setName);
  const isSharded = hello.msg === "isdbgrid";
  const supportsTransactions = isReplicaSet || isSharded;

  console.log("\n=== 1. TRANSACTION CAPABILITY ===");
  // Stvarno spojena baza, ne ono sto smo trazili — jedina istina posle connect-a.
  console.log(`  baza            : ${mongoose.connection.name}`);
  console.log(`  topologija      : ${isSharded ? "sharded cluster" : isReplicaSet ? `replica set (${hello.setName})` : "standalone"}`);
  console.log(`  maxWireVersion  : ${hello.maxWireVersion}`);
  console.log(`  transakcije     : ${supportsTransactions ? "PODRŽANE ✓" : "NISU PODRŽANE ✗"}`);
  if (!supportsTransactions) {
    console.log("  → Booking core NE SME biti pušten: svaki reserve() bi pukao.");
  }

  console.log("\n=== 2. MARKETPLACE SLOT USAGE ===");
  const slots = mongoose.connection.collection("slots");
  const total = await slots.countDocuments();
  console.log(`  ukupno Slot zapisa : ${total}`);

  if (total > 0) {
    const byStatus = await slots
      .aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            earliest: { $min: "$startTime" },
            latest: { $max: "$startTime" },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray();
    for (const row of byStatus) {
      const from = row.earliest ? new Date(row.earliest).toISOString().slice(0, 10) : "—";
      const to = row.latest ? new Date(row.latest).toISOString().slice(0, 10) : "—";
      console.log(`    ${String(row._id ?? "(prazan)").padEnd(12)} ${String(row.count).padEnd(8)} ${from} → ${to}`);
    }
    const distinctSalons = await slots.distinct("salonId");
    console.log(`  salona sa slotovima: ${distinctSalons.length}`);
    // `reserved` sa isteklim `expiresAt` = zaostatak petominutnog hold-a.
    const staleReserved = await slots.countDocuments({
      status: "reserved",
      expiresAt: { $lt: new Date() },
    });
    console.log(`  istekli "reserved" : ${staleReserved}`);
  } else {
    console.log("  → Nijedan Slot zapis. Marketplace slot sistem nije u upotrebi.");
  }

  console.log("\n=== 3. BOOKING KOLEKCIJE (očekivano prazne — Slice 5 je dark) ===");
  for (const name of [
    "bookingreservations",
    "bookingdaylocks",
    "bookingoperationreceipts",
    "bookingoutboxevents",
  ]) {
    const count = await mongoose.connection.collection(name).countDocuments();
    console.log(`  ${name.padEnd(28)} ${count}`);
  }
  console.log("");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
