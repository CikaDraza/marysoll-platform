/**
 * Odluke prikaza pogodnosti — izdvojene iz JSX-a da budu proverljive.
 *
 * Testni stack je `node` bez DOM-a, pa se komponente ne renderuju u testu.
 * Umesto „testiranja regexom nad izvorom", pravila koja bi inače živela u
 * uslovima unutar JSX-a stoje ovde kao čiste funkcije.
 */

export interface BenefitPromptState {
  enabled: boolean;
  hasUsable: boolean;
  applied: unknown | null;
  editable?: boolean;
}

/**
 * Da li se posle zakazivanja uopšte otvara ekran sa pogodnostima.
 *
 * Tri razloga da se NE otvori, i svaki je namerno:
 *   - program nije aktivan → nema šta da se ponudi;
 *   - termin već ima pogodnost → nema stackovanja, ni previdom;
 *   - server kaže da nema ničeg upotrebljivog → prazan modal je gori od
 *     nikakvog modala.
 */
export function shouldOfferBenefits(
  data: BenefitPromptState | null | undefined,
): boolean {
  if (!data) return false;
  if (!data.enabled) return false;
  if (data.applied) return false;
  return data.hasUsable;
}

/**
 * Sme li se ponuditi zamena pogodnosti.
 *
 * Zamena nikad nije „dodaj drugu": postojeća se prvo eksplicitno uklanja.
 */
export function canReplaceBenefit(
  data: BenefitPromptState | null | undefined,
): boolean {
  return Boolean(data?.applied && data.editable);
}
