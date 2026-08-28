import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardLayout from "@/layout/DashboardLayout";
import { verifyToken } from "@/lib/auth/auth-server";
import { resolveTenantCapabilitySnapshot } from "@/lib/platform/capabilities-server";
import { resolveAdminWorkspaceNavigation } from "@/lib/platform/workspace-capabilities";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Server authority za zaseban Education admin workspace. Client-side sidebar
 * projection is UX only; direct URLs still pass auth, tenant and capability
 * checks here.
 */
export default async function EducationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("tenant-access-token")?.value ??
    cookieStore.get("platform-access-token")?.value;
  const actor = token ? verifyToken(token) : null;

  if (!actor) redirect("/login");
  if (!actor.isAdmin && !actor.isSuperAdmin) redirect("/unauthorized");
  if (!actor.tenantId) redirect("/unauthorized");

  const snapshot = await resolveTenantCapabilitySnapshot(actor.tenantId);
  if (!snapshot) redirect("/unauthorized");

  const workspaces = resolveAdminWorkspaceNavigation(snapshot);
  if (!workspaces.education) {
    redirect(workspaces.salon ? "/dashboard" : "/unauthorized");
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
