/**
 * /[tenantSlug] — Path-based tenant routing.
 *
 * In production: subdomains (kiki-makeup.marysoll.com) are used.
 * In development: localhost:3000/kiki-makeup routes here.
 *
 * Sub-routes under /{tenantSlug}/:
 *   /login    → app/[tenantSlug]/login/page.tsx
 *   /register → app/[tenantSlug]/register/page.tsx
 *   /panel    → app/[tenantSlug]/panel/page.tsx
 *
 * These are handled by Next.js routing automatically — this file
 * only handles the root /{tenantSlug} path (salon home page).
 */
import { headers } from "next/headers";
import { ClientHomePage } from "@/components/client/ClientHomePage";
import { redirect } from "next/navigation";

// Paths that this catch-all should NOT intercept (they have their own pages)
// These are the ONLY top-level paths that should NOT be treated as tenantSlug.
// Sub-routes like /usluge and /termini are handled by their own pages under [tenantSlug]/.
const RESERVED = new Set([
  "dashboard",
  "superadmin",
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "verify-email",
  "resend-verification",
  "api",
  "_next",
  "favicon.ico",
  "newsletter",
  "privacy",
  "terms",
  "unauthorized",
]);

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function TenantSlugPage({ params }: Props) {
  const { tenantSlug } = await params;

  // Guard: reserved app routes — let Next.js routing handle them
  if (RESERVED.has(tenantSlug)) {
    redirect(`/${tenantSlug}`);
  }

  const headersList = await headers();
  const domainType = headersList.get("x-domain-type") ?? "marketing";
  const slugFromHeader = headersList.get("x-tenant-slug") ?? tenantSlug;

  // Whether via subdomain in production or path in dev, render the salon home
  if (domainType === "client") {
    return <ClientHomePage tenantSlug={slugFromHeader} />;
  }

  return <ClientHomePage tenantSlug={tenantSlug} />;
}
