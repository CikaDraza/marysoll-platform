import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdmin } from "@/lib/auth/auth-server";
import { resolveTenantCapabilitySnapshot } from "@/lib/platform/capabilities-server";
import { provisionEducationWorkspace } from "@/lib/platform/education-provisioning";

/**
 * Explicit, tenant-scoped activation. The client cannot choose verticals,
 * capabilities or another tenant; it can only request this canonical mutation.
 */
export async function POST(request: NextRequest) {
  const auth = requireTenantAdmin(request);
  if (!auth.success) return auth.response;

  try {
    const activated = await provisionEducationWorkspace(auth.tenantId);
    if (!activated) {
      return NextResponse.json(
        { error: "Tenant nije pronađen", code: "TENANT_NOT_FOUND" },
        { status: 404 },
      );
    }

    const snapshot = await resolveTenantCapabilitySnapshot(auth.tenantId);
    if (!snapshot) {
      return NextResponse.json(
        { error: "Tenant nije pronađen", code: "TENANT_NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, snapshot });
  } catch (error) {
    console.error("POST /api/tenant/education/activate failed:", error);
    return NextResponse.json(
      { error: "Edu Centar trenutno nije moguće aktivirati" },
      { status: 500 },
    );
  }
}
