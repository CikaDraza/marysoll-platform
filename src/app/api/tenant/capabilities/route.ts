import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";
import { resolveTenantCapabilitySnapshot } from "@/lib/platform/capabilities-server";

/**
 * Workspace dobija samo unapred razrešenu capability projekciju.
 * tenantId je isključivo iz autentifikovanog tokena, nikada iz browser input-a.
 */
export async function GET(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const decoded = token ? verifyToken(token) : null;
  if (!decoded?.tenantId) {
    return NextResponse.json({ error: "Tenant kontekst nije dostupan" }, { status: 403 });
  }

  const snapshot = await resolveTenantCapabilitySnapshot(decoded.tenantId);
  if (!snapshot) {
    return NextResponse.json({ error: "Tenant nije pronađen" }, { status: 404 });
  }
  return NextResponse.json(snapshot);
}
