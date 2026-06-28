/**
 * helpers/workingHoursDisplay.ts
 *
 * Jedinstveno pravilo za prikaz radnog vremena na svim površinama
 * (landing, /termini, /panel, /dashboard kalendar, footer).
 *
 * Radno vreme se prikazuje akko:
 *   - vlasnik nije isključio prikaz (showWorkingHours !== false), I
 *   - režim dostupnosti je "workingHours" (u "manualSlots" nema radnog vremena).
 */
export function shouldShowWorkingHours(
  salon:
    | { showWorkingHours?: boolean; availabilityMode?: string | null }
    | null
    | undefined,
): boolean {
  if (!salon) return false;
  if (salon.availabilityMode === "manualSlots") return false;
  return salon.showWorkingHours !== false;
}
