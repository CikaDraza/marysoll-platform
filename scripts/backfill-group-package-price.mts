/**
 * Group = paket sa JEDNOM cenom — prelazak sa cene po stavci na cenu na korenu.
 *
 * Stari model je za `type: "group"` držao cenu i trajanje na svakoj stavci
 * (`services[].price` / `.duration`), a nova semantika je:
 *
 *     basePrice / duration  → cena i trajanje CELOG paketa
 *     services[]            → spisak onoga što je uključeno (naziv + opis)
 *
 * Kod više ne sabira stavke, pa bi zatečeni paket bez `basePrice` u cenovniku
 * ostao bez cene. Ova skripta popunjava koren iz stavki:
 *
 *     basePrice = zbir poznatih `services[].price`   (na upit se preskače)
 *     duration  = zbir poznatih `services[].duration`
 *
 * Zbir, a ne minimum: paket nije izbor između stavki nego sve njih zajedno.
 *
 * Ne dira:
 *   - paket koji već ima `basePrice` (idempotentno, pokretanje dvaput je bezbedno)
 *   - `services[]` — nazivi i opisi ostaju, stara polja se NE brišu, pa je
 *     povratak moguć bez gubitka podataka
 *   - usluge tipa `single` i `variant`
 *
 * Paket kod kojeg nijedna stavka nema cenu se prijavljuje i preskače — tu
 * vlasnik mora sam da odluči koliko paket košta.
 *
 * Pokretanje (Node 24+, čita .env.local):
 *   npm run backfill:group-price -- --dry-run
 *   npm run backfill:group-price -- --apply
 *   npm run backfill:group-price -- --apply --tenant=<tenantId>
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

interface GroupItem {
  name?: string;
  price?: number;
  priceMode?: string;
  duration?: number;
}

function sumKnown(
  items: GroupItem[],
  pick: (item: GroupItem) => number | undefined,
): number {
  return items
    .filter((item) => item.priceMode !== "on_request")
    .map(pick)
    .filter((value): value is number => typeof value === "number" && value > 0)
    .reduce((a, b) => a + b, 0);
}

const query: Record<string, unknown> = { type: "group" };
if (TENANT) query.tenantId = new mongoose.Types.ObjectId(TENANT);

const groups = await db.collection("services").find(query).toArray();

let updated = 0;
let skippedHasPrice = 0;
const needsOwner: string[] = [];

for (const service of groups) {
  const hasBasePrice =
    typeof service.basePrice === "number" && service.basePrice > 0;
  const hasDuration =
    typeof service.duration === "number" && service.duration > 0;
  if (hasBasePrice && hasDuration) {
    skippedHasPrice += 1;
    continue;
  }

  const items: GroupItem[] = Array.isArray(service.services)
    ? service.services
    : [];
  const price = sumKnown(items, (i) => i.price);
  const duration = sumKnown(items, (i) => i.duration);

  const set: Record<string, number> = {};
  if (!hasBasePrice && price > 0) set.basePrice = price;
  if (!hasDuration && duration > 0) set.duration = duration;

  if (Object.keys(set).length === 0) {
    needsOwner.push(`${String(service._id)} — ${String(service.name ?? "?")}`);
    continue;
  }

  console.log(
    `${APPLY ? "→" : "(dry)"} ${String(service.name ?? "?")}: ${JSON.stringify(set)}`,
  );
  if (APPLY) {
    await db
      .collection("services")
      .updateOne({ _id: service._id }, { $set: set });
  }
  updated += 1;
}

console.log(`\nPaketa ukupno:            ${groups.length}`);
console.log(`Već imaju cenu i trajanje: ${skippedHasPrice}`);
console.log(`${APPLY ? "Ažurirano" : "Za ažuriranje"}:            ${updated}`);
if (needsOwner.length > 0) {
  console.log(
    `\n⚠️  ${needsOwner.length} paket(a) nema nijednu cenu ni na stavkama — vlasnik mora sam da unese:`,
  );
  for (const line of needsOwner) console.log(`   ${line}`);
}

await mongoose.disconnect();
