/**
 * Pregled i čišćenje web-push pretplata po ORIGIN-u.
 *
 * Zašto: endpoint pretplate je vezan za origin na kome je service worker
 * registrovan, a push `url` je root-relativan. Pretplata napravljena na preview
 * deployu (`…vercel.app`) živi u ISTOJ bazi kao produkcijska, pa je produkcijski
 * podsetnik otvarao `…vercel.app/dashboard`, gde nema sesije → goli `/login`.
 *
 * Od sada se uz svaku pretplatu upisuje `origin` i `lib/webPush.ts` šalje samo
 * onima iz svog okruženja. Zapisi napravljeni PRE tog polja (`origin: null`)
 * namerno i dalje primaju push — ovaj skript služi da se oni pogledaju i, ako
 * treba, obrišu.
 *
 * Brisanje je bezbedno: browser koji je i dalje pretplaćen sam se vrati u bazu
 * pri sledećoj poseti (hook `usePushNotifications` gađa
 * `/api/notifications/check-subscription`, koji zapis vraća — sada sa origin-om).
 *
 * Run (Node 20+, čita .env.local za MONGODB_URI / DB_NAME):
 *   # 1. izveštaj (ništa ne menja)
 *   node --env-file=.env.local scripts/prune-push-subscriptions.mjs
 *   # 2. obriši sve pretplate sa origin-a koji sadrži dati tekst
 *   node --env-file=.env.local scripts/prune-push-subscriptions.mjs --prune-origin vercel.app
 *   # 3. obriši zapise BEZ origin-a starije od N dana (default 30)
 *   node --env-file=.env.local scripts/prune-push-subscriptions.mjs --prune-legacy --older-than-days 30
 */
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
/**
 * Ime baze dolazi iz URI-ja. `dbName` opcija nadjacava connection string, pa se
 * prosledjuje samo kad je DB_NAME eksplicitno postavljen — inace bi skripta
 * uvek gadjala produkciju bez obzira na URI.
 */
const DB_NAME = process.env.DB_NAME;
const COLLECTIONS = ["tenantusers", "authusers"];
const NO_ORIGIN = "(bez origin-a — zapis stariji od polja)";

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI nije postavljen (koristi: node --env-file=.env.local ...)");
  process.exit(1);
}

const args = process.argv.slice(2);
function flagValue(name) {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1] ?? null;
}
const pruneOrigin = flagValue("--prune-origin");
const pruneLegacy = args.includes("--prune-legacy");
const olderThanDays = Number(flagValue("--older-than-days") ?? 30);

if (args.includes("--prune-origin") && !pruneOrigin) {
  console.error("❌ --prune-origin traži vrednost, npr. --prune-origin vercel.app");
  process.exit(1);
}
if (!Number.isFinite(olderThanDays) || olderThanDays < 0) {
  console.error("❌ --older-than-days mora biti broj dana (>= 0)");
  process.exit(1);
}

async function report(coll) {
  const docs = await coll
    .find({ "pushSubscriptions.0": { $exists: true } })
    .project({ email: 1, name: 1, pushSubscriptions: 1 })
    .toArray();

  /** origin → { count, emails:Set } */
  const byOrigin = new Map();
  for (const doc of docs) {
    for (const sub of doc.pushSubscriptions ?? []) {
      const key = sub.origin || NO_ORIGIN;
      const entry = byOrigin.get(key) ?? { count: 0, emails: new Set() };
      entry.count += 1;
      entry.emails.add(doc.email ?? String(doc._id));
      byOrigin.set(key, entry);
    }
  }

  console.log(`\n── ${coll.collectionName}: ${docs.length} korisnika sa pretplatom ──`);
  if (!byOrigin.size) {
    console.log("   (nijedna pretplata)");
    return;
  }
  for (const [origin, { count, emails }] of [...byOrigin].sort((a, b) => b[1].count - a[1].count)) {
    const who = emails.size <= 10 ? ` → ${[...emails].join(", ")}` : "";
    console.log(`   ${String(count).padStart(4)} × ${origin}${who}`);
  }
}

async function prune(coll) {
  if (pruneOrigin) {
    const res = await coll.updateMany(
      {},
      { $pull: { pushSubscriptions: { origin: { $regex: pruneOrigin, $options: "i" } } } },
    );
    console.log(
      `   ${coll.collectionName}: origin sadrži "${pruneOrigin}" → izmenjeno ${res.modifiedCount} dokumenata`,
    );
  }
  if (pruneLegacy) {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 3_600_000);
    const res = await coll.updateMany(
      {},
      {
        $pull: {
          pushSubscriptions: {
            origin: { $in: [null, ""] },
            createdAt: { $lt: cutoff },
          },
        },
      },
    );
    console.log(
      `   ${coll.collectionName}: bez origin-a i stariji od ${olderThanDays} dana → izmenjeno ${res.modifiedCount} dokumenata`,
    );
  }
}

async function main() {
  await mongoose.connect(MONGODB_URI, DB_NAME ? { dbName: DB_NAME } : {});
  const colls = COLLECTIONS.map((name) => mongoose.connection.collection(name));

  console.log("STANJE PRE:");
  for (const coll of colls) await report(coll);

  if (pruneOrigin || pruneLegacy) {
    console.log("\nBRISANJE:");
    for (const coll of colls) await prune(coll);

    console.log("\nSTANJE POSLE:");
    for (const coll of colls) await report(coll);
  } else {
    console.log(
      "\n(dry-run — ništa nije obrisano; dodaj --prune-origin <tekst> ili --prune-legacy)",
    );
  }

  await mongoose.disconnect();
  console.log("\nGotovo.");
}

main().catch(async (err) => {
  console.error("❌ Skript pukao:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
