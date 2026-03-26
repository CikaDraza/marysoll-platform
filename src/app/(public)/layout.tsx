/**
 * (public) route group layout
 *
 * Wraps all public-facing salon pages:
 *   - /[tenantSlug]           → salon landing page
 *   - /[tenantSlug]/login     → client login
 *   - /[tenantSlug]/register  → client register
 *   - /[tenantSlug]/panel     → client panel (auth guarded client-side)
 *   - /[tenantSlug]/termini   → public appointments calendar
 *   - /[tenantSlug]/usluge    → public services list
 *   - /[tenantSlug]/forgot-password
 *   - /[tenantSlug]/resend-verification
 *
 * No auth guard here — individual pages handle their own protection.
 * Route group name "(public)" does NOT appear in URLs.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
