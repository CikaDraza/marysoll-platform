/**
 * Novac u domenu naplate — uvek u MINOR UNITS, uvek ceo broj.
 *
 * Appointment domen radi u celim dinarima i tako ostaje. Platni domen ne sme:
 * provizije i delimični povraćaji se tu zaokružuju, pa bi rad u celim dinarima
 * proizveo nesklad koji se kasnije ne može objasniti. Konverzija se dešava na
 * tačno jednoj granici i zaokružuje se jednom.
 *
 * `0` je stvarna nula, `null` je nepoznato — isto pravilo kao u cenama termina.
 */

/** Ceo dinar → para. 4.800 RSD = 480000. */
export function toMinor(majorUnits: number): number {
  return Math.round(majorUnits * 100);
}

/** Para → ceo dinar. Zaokružuje; koristiti samo na granici prikaza. */
export function toMajor(minorUnits: number): number {
  return Math.round(minorUnits) / 100;
}

/**
 * Iznos naplate mora biti ceo broj para i strogo pozitivan.
 *
 * Naplata od nula dinara nije naplata nego greška u pozivaocu — za razliku od
 * cene, gde je nula legitimna („besplatno").
 */
export function isValidChargeAmount(minorUnits: number): boolean {
  return Number.isInteger(minorUnits) && minorUnits > 0;
}
