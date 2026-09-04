/**
 * Registry provera — jedan izvor istine za ključeve, nazive, severity mapu i
 * preporučene repair akcije (spec: docs/PANTA-IDENTITY-LOYALTY-HEALTH.md).
 *
 * Provere su PODACI: app kolektori se registruju po ključu, UI grupiše po
 * severity-ju, a repair je u read-only fazi samo preporuka (tekst) — nikakva
 * akcija se ne izvršava odavde.
 */

import type { IntegritySeverity } from "./types";

export type IntegrityCheckScope = "tenant" | "platform";

export interface IntegrityCheckDefinition {
  key: string;
  /** Granica podataka na kojoj se provera izvršava. */
  scope: IntegrityCheckScope;
  /** Ljudski naziv za UI/support. */
  name: string;
  /** Šta provera utvrđuje. */
  description: string;
  /**
   * Podrazumevani severity provere. Pojedinačan nalaz sme da odstupi
   * (npr. orphans: account→nepostojeći user = error, user bez accounta = info).
   */
  defaultSeverity: IntegritySeverity;
  /** Preporučena repair akcija (read-only faza: samo tekst preporuke). */
  repair: string;
}

export const INTEGRITY_CHECKS = [
  {
    key: "client.identity.duplicates",
    scope: "tenant",
    name: "Mogući duplikati klijenata",
    description:
      "Isti normalizovani telefon na više klijentskih naloga — kandidati za merge (duplikat nije nužno korupcija).",
    defaultSeverity: "info",
    repair: "Pregledati grupu i po potrebi spojiti naloge kroz admin merge.",
  },
  {
    key: "client.identity.mergedReferences",
    scope: "tenant",
    name: "Reference na spojen nalog",
    description:
      "Merged/suspendovan korisnik (mergedInto postavljen) i dalje je primarni vlasnik aktivnih zapisa (termini, vaučeri, ledger…).",
    defaultSeverity: "warning",
    repair: "Reassign referenci na canonical (mergedInto) nalog.",
  },
  {
    key: "client.identity.invalidReferences",
    scope: "tenant",
    name: "Reference na nepostojeći nalog",
    description:
      "Domenski zapisi (Appointment/Voucher/…) pokazuju na korisnika koji ne postoji u bazi.",
    defaultSeverity: "error",
    repair:
      "Ručna istraga porekla reference; zatim reassign na ispravan nalog ili arhiviranje zapisa.",
  },
  {
    key: "loyalty.account.orphans",
    scope: "tenant",
    name: "Loyalty nalozi bez vlasnika / klijenti bez naloga",
    description:
      "LoyaltyAccount pokazuje na nepostojećeg ili merged korisnika (error); aktivan klijent bez loyalty naloga (info — nastaje automatski pri prvom događaju).",
    defaultSeverity: "error",
    repair:
      "Error: povezati nalog sa ispravnim korisnikom ili arhivirati. Info: nije potrebna akcija.",
  },
  {
    key: "loyalty.account.duplicates",
    scope: "tenant",
    name: "Duplirani loyalty nalozi",
    description:
      "Aktivan klijent sa više od jednog LoyaltyAccount-a (krši unique {tenantId, tenantUserId}).",
    defaultSeverity: "warning",
    repair:
      "Spojiti duple naloge: ledger reassign na jedan nalog pa recomputeAccount.",
  },
  {
    key: "loyalty.ledger.mismatch",
    scope: "tenant",
    name: "Ledger ↔ nalog nesklad",
    description:
      "Ledger unos čiji se tenantUserId ili tenantId ne slaže sa nalogom na koji pokazuje — balans se pripisuje pogrešnom klijentu.",
    defaultSeverity: "error",
    repair: "Reassign ledger unosa na ispravan nalog, zatim recomputeAccount.",
  },
  {
    key: "loyalty.balance.mismatch",
    scope: "tenant",
    name: "Keširan balans ≠ ledger",
    description:
      "Sačuvana heartsBalance/pointsBalance polja se ne slažu sa zbirom iz ledgera (izvor istine).",
    defaultSeverity: "warning",
    repair: "recomputeAccount(accountId) — preračun iz ledgera.",
  },
  {
    key: "voucher.owner.invalid",
    scope: "tenant",
    name: "Vaučer sa nevažećim vlasnikom",
    description:
      "Vlasnik vaučera ne postoji, merged je ili suspendovan, ili je iz pogrešnog tenanta — klijent ima vaučer koji ne vidi.",
    defaultSeverity: "warning",
    repair:
      "Reassign vaučera na canonical (mergedInto) vlasnika, odnosno ispravan nalog.",
  },
  {
    key: "appointment.client.invalid",
    scope: "tenant",
    name: "Termin sa nevažećim klijent profilom",
    description:
      "Appointment.clientProfileId pokazuje na nepostojećeg/merged/suspendovanog korisnika ili pogrešan tenant — klijent ne vidi termin, completion ne dodeljuje srca pravom nalogu.",
    defaultSeverity: "error",
    repair: "Reassign termina na canonical (mergedInto), odnosno ispravan profil.",
  },
  {
    key: "seo.tenant.metadata",
    scope: "tenant",
    name: "SEO profil tenanta",
    description:
      "Kvalitet javnih metapodataka salona: ručni SEO naslov/opis, opis salona, grad, javni profili na mrežama i raster slika za social karticu. Saveti — slab SEO profil ne sme da spreči objavljivanje sajta.",
    defaultSeverity: "info",
    repair:
      "Popuniti nedostajuća polja u podešavanjima salona; ručno unet SEO uvek pobeđuje automatski fallback.",
  },
  {
    key: "tenant.ownership.missing",
    scope: "tenant",
    name: "Salon bez vlasnika",
    description:
      "Tenant.ownerId ne pokazuje na postojeći AuthUser, ili salon nema tačno jedan OWNER membership, ili taj OWNER TenantUser nije vezan za istog vlasnika. Salon NIKADA ne sme postojati bez vlasnika — takav zapis niko ne može da preuzme kroz redovnu prijavu.",
    defaultSeverity: "error",
    repair:
      "Superadmin eksplicitno radi Reassign ownership; ownership transfer je specifikovan i odložen (docs/PANTA-TENANT-OWNERSHIP-LIFECYCLE.md). NIKADA ne povezivati salon sa nalogom samo zato što se email poklapa — to je integrity incident, ne onboarding.",
  },
  {
    key: "tenant.ownership.orphanAccount",
    scope: "platform",
    name: "Vlasnički nalog bez salona",
    description:
      "AuthUser sa platformRole OWNER koji nema nijedan TenantUser ni Tenant. Po zaključanom lifecycle ugovoru (docs/PANTA-TENANT-OWNERSHIP-LIFECYCLE.md) ovo stanje ne nastaje: jedina destruktivna owner akcija je trajno brisanje salona, koje uklanja i salon i vlasnički nalog. Pojava znači nepotpuno brisanje ili stariji bug.",
    defaultSeverity: "warning",
    repair:
      "Proveriti da li je brisanje prekinuto na pola. Ako nema podataka za spasavanje, ukloniti zaostali AuthUser; inače restore iz backup-a.",
  },
  {
    key: "notifications.push.subscriptions",
    scope: "tenant",
    name: "Push pretplate po korisniku",
    description:
      "Pregled aktivnih push pretplata (admin i klijent naloga): ko je pretplaćen, koliko uređaja, kad poslednji put — plus WARNING kad admin/staff ima push uključen u podešavanjima, ali nema nijednu registrovanu pretplatu.",
    defaultSeverity: "info",
    repair:
      "WARNING: korisnik treba ponovo da omogući push u browseru/telefonu (podešavanja su uključena, ali pretplata nedostaje ili je istekla).",
  },
  {
    key: "payments.webhook.stuck",
    scope: "platform",
    name: "Nerazrešeni webhook događaji",
    description:
      "Dolazni webhook događaji koji su ostali `failed` ili `received` bez razrešenja. Prijem je zaštićen unique ključem {provider, providerEventId}, ali obrada sme da pukne — a pretplata salona tada može ostati neusaglašena sa provajderom (plaćanje prošlo, plan nije podignut, ili obrnuto). Provera je platformska jer se događaj upisuje PRE razrešavanja tenanta, pa zaglavljen zapis često i nema tenant.",
    defaultSeverity: "error",
    repair:
      "Pogledati `lastError` na zapisu. Ponovna obrada je bezbedna: svi upisi su apsolutni `$set`, a ponovljenu isporuku hvata unique ključ. Ako je događaj prestignut novijim, označiti ga kao `skipped`.",
  },
  {
    key: "payment.appointment.overpaid",
    scope: "tenant",
    name: "Naplata veća od vrednosti termina",
    description:
      "Neto novac koji je za termin prošao kroz platformu (depozit, online uplata) veći je od `pricing.chargedAmount`, ili termin uopšte nema upisan naplaćen iznos iako je novac stigao. Hvata pogrešno ukucan iznos, nezabeležen povraćaj i depozit koji niko nije uračunao. Proverava samo završene termine — dok termin traje, depozit legitimno premašuje iznos koji još ne postoji.",
    defaultSeverity: "error",
    repair:
      "Uporediti ledger termina sa unetim naplaćenim iznosom. Ako je iznos pogrešno ukucan, ispraviti ga; ako je novac vraćen izvan sistema, upisati odgovarajući `refund` zapis.",
  },
] as const satisfies readonly IntegrityCheckDefinition[];

export type IntegrityCheckKey = (typeof INTEGRITY_CHECKS)[number]["key"];
export type IntegrityCheckKeyForScope<S extends IntegrityCheckScope> = Extract<
  (typeof INTEGRITY_CHECKS)[number],
  { scope: S }
>["key"];

/** Definicija po ključu — baca za nepoznat ključ (registry je izvor istine). */
export function getCheckDefinition(key: string): IntegrityCheckDefinition {
  const def = INTEGRITY_CHECKS.find((c) => c.key === key);
  if (!def) throw new Error(`Nepoznata integrity provera: ${key}`);
  return def;
}
