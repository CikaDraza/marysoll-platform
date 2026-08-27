/**
 * Kopira zadate tenante iz jedne baze u drugu — za staging QA nad realnim
 * podacima, bez ijednog upisa u izvor.
 *
 *   IZVOR  MONGODB_URI          (samo se čita)
 *   CILJ   MONGODB_STAGING_URI  (piše se samo uz --apply)
 *
 * ZAŠTO POSTOJI
 * Staging ima smisla samo ako se na njemu vidi ono što će se videti u
 * produkciji. Prazna baza dokazuje da se kod builda, ne da upgrade postojećih
 * tenant podataka prolazi bez gubitka sadržaja.
 *
 * OBIM — SVE, ne uzorak
 * Kolekcije se ne nabrajaju ručno (takav spisak se razilazi prvom izmenom).
 * Skripta ih otkriva i sama klasifikuje:
 *
 *   ima `tenantId`  → kopira se samo za zadate tenante
 *   ima `salonId`   → veže se preko kopiranih `salonprofiles._id`
 *   ni jedno ni drugo → platformska kolekcija, kopira se cela
 *
 * `_id` se čuva, pa sve reference ostaju ispravne.
 *
 * BEZBEDNOST
 *   - izvor se otvara i koristi ISKLJUČIVO za čitanje;
 *   - ako izvor i cilj razreše na istu bazu, skripta staje;
 *   - `--dry-run` je podrazumevan; bez `--apply` se ne piše ništa;
 *   - obe baze se ispisuju pre bilo kakvog rada, po imenu koje je stvarno
 *     spojeno (`connection.name`), ne po onome što je traženo.
 *
 * IDEMPOTENTNO
 * Pre upisa se u CILJU briše tačno onaj obim koji se kopira (isti filter,
 * odnosno isti `_id`-jevi za platformske kolekcije). Ponovno pokretanje daje
 * isto stanje, bez duplikata.
 *
 * Pokretanje (Node 24+, čita .env.local):
 *   npm run copy:tenants -- --dry-run
 *   npm run copy:tenants -- --apply
 *   npm run copy:tenants -- --apply --include-diagnostics
 *   npm run copy:tenants -- --dry-run --tenant=<id> --tenant=<id>
 */
import mongoose from "mongoose";

/**
 * Podrazumevani obim: cetiri tenanta koja pokrivaju sve sto QA treba da vidi.
 *
 *   kiki-kiss-beauty            theme-7   zatecen beauty salon
 *   marysoll-makeup-nails       theme-1   zatecen beauty salon, druga tema
 *   the-lash-room-by-anja       theme-8   custom prezentacija + booking
 *   marina-...-skincare-edu     theme-9   nov slucaj, nosi najveci rizik
 *
 * Theme-8 je ovde namerno: to je jedina tema sa sopstvenim booking ponasanjem,
 * pa je najbolji dokaz da theme-9 logika NIJE procurila u stare teme.
 */
const DEFAULT_TENANT_IDS = [
  "69dff2da968ed4117e16d6f6",
  "6a05c67fabc69f307bfa9b22",
  "6a329773f65185c5070c77fa",
  "6a8c2c9cae52db4b3ed0f975",
];

/**
 * Dijagnostički zapisi — hiljade redova istorije koja QA-u ne treba i samo
 * usporava kopiranje. Uključuju se sa `--include-diagnostics`.
 */
const DIAGNOSTIC_COLLECTIONS = new Set(["diagreports", "seoanalysisruns"]);

const SOURCE_URI = process.env.MONGODB_URI;
const TARGET_URI = process.env.MONGODB_STAGING_URI;

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const INCLUDE_DIAGNOSTICS = args.includes("--include-diagnostics");
const tenantArgs = args
  .filter((a) => a.startsWith("--tenant="))
  .map((a) => a.split("=")[1])
  .filter(Boolean);
const TENANT_IDS = tenantArgs.length > 0 ? tenantArgs : DEFAULT_TENANT_IDS;

if (!SOURCE_URI) {
  console.error("❌ MONGODB_URI (izvor) nije postavljen.");
  process.exit(1);
}
if (!TARGET_URI) {
  console.error(
    [
      "❌ MONGODB_STAGING_URI (cilj) nije postavljen.",
      "   Bez njega nema gde da se kopira, a NE koristi se izvor kao rezerva.",
    ].join("\n"),
  );
  process.exit(1);
}

function pad(v: string, w: number): string {
  return v.length >= w ? v : v + " ".repeat(w - v.length);
}

async function main(): Promise<void> {
  const source = await mongoose.createConnection(SOURCE_URI!).asPromise();
  const target = await mongoose.createConnection(TARGET_URI!).asPromise();
  const src = source.db!;
  const dst = target.db!;

  // ── Tvrda granica ────────────────────────────────────────────────────────
  if (src.databaseName === dst.databaseName) {
    console.error(
      [
        "❌ Izvor i cilj su ISTA baza: " + src.databaseName,
        "   Kopiranje bi pisalo preko izvora. Prekinuto pre ijednog upisa.",
      ].join("\n"),
    );
    await source.close();
    await target.close();
    process.exit(1);
  }

  console.log(
    `\n${APPLY ? "APPLY" : "DRY-RUN"}` +
      `\n  IZVOR (čita se)  : ${src.databaseName}` +
      `\n  CILJ  (${APPLY ? "PIŠE SE" : "ne dira se"}) : ${dst.databaseName}` +
      `\n  tenanta          : ${TENANT_IDS.length}\n`,
  );

  const oids = TENANT_IDS.map((id) => new mongoose.Types.ObjectId(id));

  // ── Postoje li uopšte ────────────────────────────────────────────────────
  const tenants = await src
    .collection("tenants")
    .find({ _id: { $in: oids } })
    .toArray();

  if (tenants.length !== TENANT_IDS.length) {
    const found = new Set(tenants.map((t) => String(t._id)));
    for (const id of TENANT_IDS) {
      if (!found.has(id)) console.error(`  ❌ tenant ne postoji: ${id}`);
    }
    await source.close();
    await target.close();
    process.exit(1);
  }
  for (const t of tenants) {
    console.log(`  ✓ ${String(t._id)}  ${t.slug}`);
  }

  // `slots` i sličn i vežu se preko SalonProfile._id, ne preko tenantId.
  const profileIds = (
    await src
      .collection("salonprofiles")
      .find({ tenantId: { $in: oids } }, { projection: { _id: 1 } })
      .toArray()
  ).map((p) => p._id);

  const names = (await src.listCollections().toArray())
    .map((c) => c.name)
    .sort();

  console.log(
    `\n  ${pad("KOLEKCIJA", 28)}${pad("VEZA", 12)}${pad("DOKUMENATA", 11)}ISHOD`,
  );
  console.log(`  ${"─".repeat(74)}`);

  let totalDocs = 0;
  let totalCollections = 0;

  for (const name of names) {
    const col = src.collection(name);

    if (!INCLUDE_DIAGNOSTICS && DIAGNOSTIC_COLLECTIONS.has(name)) {
      console.log(
        `  ${pad(name, 28)}${pad("—", 12)}${pad("—", 11)}preskočeno (dijagnostika)`,
      );
      continue;
    }

    // ── Klasifikacija: pitamo podatke, ne spisak imena ─────────────────────
    let filter: Record<string, unknown>;
    let link: string;

    if (name === "tenants") {
      filter = { _id: { $in: oids } };
      link = "_id";
    } else if (await col.countDocuments({ tenantId: { $exists: true } }, { limit: 1 })) {
      filter = { tenantId: { $in: oids } };
      link = "tenantId";
    } else if (await col.countDocuments({ salonId: { $exists: true } }, { limit: 1 })) {
      filter = { salonId: { $in: profileIds } };
      link = "salonId";
    } else {
      filter = {};
      link = "platformska";
    }

    const docs = await col.find(filter).toArray();
    if (docs.length === 0) {
      console.log(`  ${pad(name, 28)}${pad(link, 12)}${pad("0", 11)}ništa`);
      continue;
    }

    totalDocs += docs.length;
    totalCollections += 1;

    if (!APPLY) {
      console.log(
        `  ${pad(name, 28)}${pad(link, 12)}${pad(String(docs.length), 11)}kopiralo bi se`,
      );
      continue;
    }

    // Idempotentno: u CILJU se briše tačno ono što se sada upisuje.
    const removal =
      link === "platformska"
        ? { _id: { $in: docs.map((d) => d._id) } }
        : filter;
    await dst.collection(name).deleteMany(removal);
    await dst.collection(name).insertMany(docs, { ordered: false });

    console.log(
      `  ${pad(name, 28)}${pad(link, 12)}${pad(String(docs.length), 11)}kopirano`,
    );
  }

  console.log(
    `\n  ZBIR: ${totalDocs} dokumenata iz ${totalCollections} kolekcija`,
  );

  if (APPLY) {
    console.log(`  ✅ Upisano u \`${dst.databaseName}\`. Izvor nije dirnut.`);
    console.log(`     Ponovno pokretanje daje isto stanje — bez duplikata.`);
  } else {
    console.log(`  Ništa nije promenjeno. Za upis:`);
    console.log(`     npm run copy:tenants -- --apply`);
  }

  console.log("");
  await source.close();
  await target.close();
}

main().catch(async (err) => {
  console.error("❌ Greška:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
