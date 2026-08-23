/**
 * READ-ONLY empirijski izveštaj pred Slice 6B. Ne piše NIŠTA — nema backfill-a.
 *
 * Zašto: `appointment_rescheduled` nosi DVA značenja, a diskriminator nije
 * status nego prisustvo `proposedDate`:
 *
 *   rescheduled + proposedDate  → admin je PREDLOŽIO novi termin;
 *                                 zapis i dalje drži STARI interval
 *   rescheduled bez proposedDate → klijent je već POMERIO termin;
 *                                 zapis drži novi interval
 *
 * Za occupancy je današnje ponašanje tačno u oba slučaja (`date`/`time` uvek
 * nose stvarno držani termin). Razlika je bitna za adoption mapper
 * `Appointment.status → ReservationStatus` u Slice 6B, koji bez ovih brojki
 * nema osnov da izabere jedno mapiranje.
 *
 * Izveštaj usput meri i dve druge stvari koje 6B treba da zna:
 *   · koliko zapisa već ima `bookingReservationId` (migrirani),
 *   · koliko `no_show` / `completed` zapisa sedi na intervalu koji JOŠ NIJE
 *     prošao — to je populacija zbog koje legacy politika mora da bude
 *     `blocking_until_end`, a ne `released` (T3 §21.2.1).
 *
 * Run (Node 20+, čita .env.local za MONGODB_URI / DB_NAME):
 *   node --env-file=.env.local scripts/reports/appointment-rescheduled-report.mjs
 *   node --env-file=.env.local scripts/reports/appointment-rescheduled-report.mjs --tenant <tenantId>
 *   node --env-file=.env.local scripts/reports/appointment-rescheduled-report.mjs --json
 */
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "marysoll_db";

if (!MONGODB_URI) {
  console.error("MONGODB_URI nije postavljen (probaj --env-file=.env.local).");
  process.exit(1);
}

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const tenantArg = args[args.indexOf("--tenant") + 1];
const tenantFilter =
  args.includes("--tenant") && tenantArg
    ? { tenantId: new mongoose.Types.ObjectId(tenantArg) }
    : {};

function pad(value, width) {
  return String(value).padEnd(width);
}

async function main() {
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  const appointments = mongoose.connection.collection("appointments");

  const byStatus = await appointments
    .aggregate([
      { $match: tenantFilter },
      {
        $group: {
          _id: {
            status: "$status",
            hasProposed: {
              $and: [
                { $ne: ["$proposedDate", null] },
                { $ne: ["$proposedDate", undefined] },
                { $ne: ["$proposedDate", ""] },
              ],
            },
            migrated: {
              $and: [
                { $ne: ["$bookingReservationId", null] },
                { $ne: ["$bookingReservationId", undefined] },
              ],
            },
          },
          count: { $sum: 1 },
          earliestDate: { $min: "$date" },
          latestDate: { $max: "$date" },
        },
      },
      { $sort: { count: -1 } },
    ])
    .toArray();

  // Zapisi u `blocking_until_end` statusima čiji interval JOŠ NIJE prošao.
  const today = new Date().toISOString().slice(0, 10);
  const futureFinal = await appointments
    .aggregate([
      {
        $match: {
          ...tenantFilter,
          status: { $in: ["no_show", "completed"] },
          date: { $gte: today },
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ])
    .toArray();

  const total = byStatus.reduce((sum, row) => sum + row.count, 0);

  if (asJson) {
    console.log(JSON.stringify({ total, byStatus, futureFinal, today }, null, 2));
  } else {
    console.log(`\nUkupno Appointment zapisa u opsegu: ${total}\n`);
    console.log(
      `${pad("status", 26)}${pad("proposedDate", 14)}${pad("migriran", 10)}${pad("broj", 8)}${pad("od", 12)}do`,
    );
    console.log("-".repeat(88));
    for (const row of byStatus) {
      console.log(
        pad(row._id.status ?? "(prazan)", 26) +
          pad(row._id.hasProposed ? "ima" : "—", 14) +
          pad(row._id.migrated ? "da" : "—", 10) +
          pad(row.count, 8) +
          pad(row.earliestDate ?? "—", 12) +
          (row.latestDate ?? "—"),
      );
    }

    console.log(
      `\n`,
      `no_show / completed na intervalu koji JOŠ NIJE prošao (>= ${today}):`,
    );
    if (futureFinal.length === 0) {
      console.log("  nijedan");
    } else {
      for (const row of futureFinal) {
        console.log(`  ${pad(row._id, 12)} ${row.count}`);
      }
    }
    console.log(
      "\n  Ovi zapisi su razlog zašto legacy politika mora biti `blocking_until_end`.",
      "\n  Da su svedeni na `released`, njihov interval bi se odmah oslobodio.\n",
    );
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
