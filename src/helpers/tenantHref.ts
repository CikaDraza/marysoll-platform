/**
 * helpers/tenantHref.ts — prefiks tenant slug-a na internim linkovima.
 *
 * Jedna definicija za oba sveta: server (gde se grade native view modeli) i
 * klijent (`ThemeLayout`, gde ide u `ThemeBlockScope.routing`). Dve kopije bi
 * značile da linkovi u native delu i u blokovima mogu tiho da se raziđu.
 */

export function makeResolveHref(tenantSlug?: string) {
  const prefix = tenantSlug ? `/${tenantSlug}` : "";
  return (href: string): string => {
    if (!href) return "#";
    if (/^https?:\/\//.test(href)) return href;
    return href.startsWith("/") ? `${prefix}${href}` : `${prefix}/${href}`;
  };
}
