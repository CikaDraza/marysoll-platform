import "server-only";

/**
 * Identity & Loyalty Health — server-side data-integrity provere po tenantu.
 * Potrošač (M3: superadmin API ruta) uvozi SAMO runIntegrityChecks; kontrakt
 * tipovi dolaze kroz adapter lib/platform/diagnostic-client.
 */

export { runIntegrityChecks } from "./runner";
