/**
 * scripts/make-theme-fixtures.mjs
 *
 * Pravi test fixture od STVARNIH landingStructure zapisa:
 *   npm run fixtures:theme
 *
 * READ-ONLY prema bazi. Redakcija ide po PUTANJI/imenu polja, nikad po obliku
 * vrednosti — prva verzija je regexom hvatala i `gallery.treatments[].id`
 * (timestamp ID liči na telefon) pa su svi ID-jevi u galeriji postajali isti.
 * Sada se dira samo ono što je stvarno lični kontakt; sve ostalo (ID-jevi,
 * tekstovi, flagovi, varijante) ostaje bit-za-bit kao u produkciji.
 *
 * Stvarne PII putanje u podacima (skenirano 2026-08-16):
 *   landing.hero.contact.phone
 *   landing.faq.support.email
 */
import mongoose from "mongoose";
import { writeFileSync } from "node:fs";

const OUT = "src/lib/platform/__fixtures__/landing-structures.json";

/** Imena polja koja se uvek redaguju, bez obzira gde se pojave. */
const PHONE_KEYS = new Set(["phone", "whatsapp", "telegram", "viber", "mobile"]);
const EMAIL_KEYS = new Set(["email", "contactemail", "supportemail"]);

const PHONE_PLACEHOLDER = "+381000000000";
const EMAIL_PLACEHOLDER = "kontakt@example.com";

function redact(value, key = "") {
  if (Array.isArray(value)) return value.map((v) => redact(v));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = redact(v, k);
    return out;
  }
  if (typeof value !== "string" || value === "") return value;

  const k = key.toLowerCase();
  if (PHONE_KEYS.has(k)) return PHONE_PLACEHOLDER;
  if (EMAIL_KEYS.has(k)) return EMAIL_PLACEHOLDER;
  return value;
}

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI nije postavljen");

await mongoose.connect(uri);
const db = mongoose.connection.db;

const tenants = Object.fromEntries(
  (
    await db
      .collection("tenants")
      .find({}, { projection: { subdomain: 1, name: 1 } })
      .toArray()
  ).map((t) => [String(t._id), t.subdomain ?? t.name]),
);

const out = {};
for (const p of await db
  .collection("salonprofiles")
  .find({}, { projection: { landingStructure: 1, tenantId: 1 } })
  .toArray()) {
  const key = tenants[String(p.tenantId)] ?? String(p.tenantId);
  out[key] = redact(p.landingStructure);
}

writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`${OUT}: ${Object.keys(out).length} tenanta`);

await mongoose.disconnect();
