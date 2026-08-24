/**
 * Registry provera — jedan izvor istine za ključeve, nazive, severity mapu i
 * preporučene repair akcije (spec: docs/PANTA-IDENTITY-LOYALTY-HEALTH.md).
 *
 * Provere su PODACI: app kolektori se registruju po ključu, UI grupiše po
 * severity-ju, a repair je u read-only fazi samo preporuka (tekst) — nikakva
 * akcija se ne izvršava odavde.
 */

import type { IntegritySeverity } from "./types";

export interface IntegrityCheckDefinition {
  key: string;
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

export const INTEGRITY_CHECKS: readonly IntegrityCheckDefinition[] = [
  {
    key: "client.identity.duplicates",
    name: "Mogući duplikati klijenata",
    description:
      "Isti normalizovani telefon na više klijentskih naloga — kandidati za merge (duplikat nije nužno korupcija).",
    defaultSeverity: "info",
    repair: "Pregledati grupu i po potrebi spojiti naloge kroz admin merge.",
  },
  {
    key: "client.identity.mergedReferences",
    name: "Reference na spojen nalog",
    description:
      "Merged/suspendovan korisnik (mergedInto postavljen) i dalje je primarni vlasnik aktivnih zapisa (termini, vaučeri, ledger…).",
    defaultSeverity: "warning",
    repair: "Reassign referenci na canonical (mergedInto) nalog.",
  },
  {
    key: "client.identity.invalidReferences",
    name: "Reference na nepostojeći nalog",
    description:
      "Domenski zapisi (Appointment/Voucher/…) pokazuju na korisnika koji ne postoji u bazi.",
    defaultSeverity: "error",
    repair:
      "Ručna istraga porekla reference; zatim reassign na ispravan nalog ili arhiviranje zapisa.",
  },
  {
    key: "loyalty.account.orphans",
    name: "Loyalty nalozi bez vlasnika / klijenti bez naloga",
    description:
      "LoyaltyAccount pokazuje na nepostojećeg ili merged korisnika (error); aktivan klijent bez loyalty naloga (info — nastaje automatski pri prvom događaju).",
    defaultSeverity: "error",
    repair:
      "Error: povezati nalog sa ispravnim korisnikom ili arhivirati. Info: nije potrebna akcija.",
  },
  {
    key: "loyalty.account.duplicates",
    name: "Duplirani loyalty nalozi",
    description:
      "Aktivan klijent sa više od jednog LoyaltyAccount-a (krši unique {tenantId, tenantUserId}).",
    defaultSeverity: "warning",
    repair:
      "Spojiti duple naloge: ledger reassign na jedan nalog pa recomputeAccount.",
  },
  {
    key: "loyalty.ledger.mismatch",
    name: "Ledger ↔ nalog nesklad",
    description:
      "Ledger unos čiji se tenantUserId ili tenantId ne slaže sa nalogom na koji pokazuje — balans se pripisuje pogrešnom klijentu.",
    defaultSeverity: "error",
    repair: "Reassign ledger unosa na ispravan nalog, zatim recomputeAccount.",
  },
  {
    key: "loyalty.balance.mismatch",
    name: "Keširan balans ≠ ledger",
    description:
      "Sačuvana heartsBalance/pointsBalance polja se ne slažu sa zbirom iz ledgera (izvor istine).",
    defaultSeverity: "warning",
    repair: "recomputeAccount(accountId) — preračun iz ledgera.",
  },
  {
    key: "voucher.owner.invalid",
    name: "Vaučer sa nevažećim vlasnikom",
    description:
      "Vlasnik vaučera ne postoji, merged je ili suspendovan, ili je iz pogrešnog tenanta — klijent ima vaučer koji ne vidi.",
    defaultSeverity: "warning",
    repair:
      "Reassign vaučera na canonical (mergedInto) vlasnika, odnosno ispravan nalog.",
  },
  {
    key: "appointment.client.invalid",
    name: "Termin sa nevažećim klijent profilom",
    description:
      "Appointment.clientProfileId pokazuje na nepostojećeg/merged/suspendovanog korisnika ili pogrešan tenant — klijent ne vidi termin, completion ne dodeljuje srca pravom nalogu.",
    defaultSeverity: "error",
    repair: "Reassign termina na canonical (mergedInto), odnosno ispravan profil.",
  },
  {
    key: "seo.tenant.metadata",
    name: "SEO profil tenanta",
    description:
      "Kvalitet javnih metapodataka salona: ručni SEO naslov/opis, opis salona, grad, javni profili na mrežama i raster slika za social karticu. Saveti — slab SEO profil ne sme da spreči objavljivanje sajta.",
    defaultSeverity: "info",
    repair:
      "Popuniti nedostajuća polja u podešavanjima salona; ručno unet SEO uvek pobeđuje automatski fallback.",
  },
  {
    key: "tenant.ownership.missing",
    name: "Salon bez vlasnika",
    description:
      "Tenant.ownerId ne pokazuje na postojeći AuthUser, ili salon nema tačno jedan OWNER membership, ili taj OWNER TenantUser nije vezan za istog vlasnika. Salon NIKADA ne sme postojati bez vlasnika — takav zapis niko ne može da preuzme kroz redovnu prijavu.",
    defaultSeverity: "error",
    repair:
      "Superadmin eksplicitno radi Reassign ownership. NIKADA ne povezivati salon sa nalogom samo zato što se email poklapa — to je integrity incident, ne onboarding.",
  },
  {
    key: "tenant.ownership.orphanAccount",
    name: "Vlasnički nalog bez salona",
    description:
      "AuthUser sa platformRole OWNER koji nema nijedan TenantUser ni Tenant. Po lifecycle ugovoru ovo stanje ne nastaje: vlasnik ne može obrisati samo svoj nalog dok poseduje salon, a trajno brisanje uklanja i salon i nalog. Pojava znači nepotpuno brisanje ili stariji bug.",
    defaultSeverity: "warning",
    repair:
      "Proveriti da li je brisanje prekinuto na pola. Ako nema podataka za spasavanje, ukloniti zaostali AuthUser; inače restore iz backup-a.",
  },
  {
    key: "notifications.push.subscriptions",
    name: "Push pretplate po korisniku",
    description:
      "Pregled aktivnih push pretplata (admin i klijent naloga): ko je pretplaćen, koliko uređaja, kad poslednji put — plus WARNING kad admin/staff ima push uključen u podešavanjima, ali nema nijednu registrovanu pretplatu.",
    defaultSeverity: "info",
    repair:
      "WARNING: korisnik treba ponovo da omogući push u browseru/telefonu (podešavanja su uključena, ali pretplata nedostaje ili je istekla).",
  },
] as const;

export type IntegrityCheckKey = (typeof INTEGRITY_CHECKS)[number]["key"];

/** Definicija po ključu — baca za nepoznat ključ (registry je izvor istine). */
export function getCheckDefinition(key: string): IntegrityCheckDefinition {
  const def = INTEGRITY_CHECKS.find((c) => c.key === key);
  if (!def) throw new Error(`Nepoznata integrity provera: ${key}`);
  return def;
}
