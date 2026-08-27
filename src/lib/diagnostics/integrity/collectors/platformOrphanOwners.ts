import "server-only";

import { AuthUser } from "@/models/AuthUser";
import { Tenant } from "@/models/Tenant";
import { TenantUser } from "@/models/TenantUser";
import { makeFinding } from "@/lib/platform/diagnostic-client";
import type { PlatformIntegrityCollector } from "./types";

const KEY = "tenant.ownership.orphanAccount";

export const collectPlatformOrphanOwners: PlatformIntegrityCollector = async () => {
  const owners = (await AuthUser.find({ platformRole: "OWNER" })
    .select("_id")
    .lean()) as unknown as { _id: unknown }[];
  const ownerIds = owners.map((owner) => String(owner._id));

  if (ownerIds.length === 0) {
    return { findings: [], scanned: 0 };
  }

  const [tenants, memberships] = await Promise.all([
    Tenant.find({ ownerId: { $in: ownerIds } }).select("ownerId").lean(),
    TenantUser.find({ role: "OWNER", authUserId: { $in: ownerIds } })
      .select("authUserId")
      .lean(),
  ]);
  const tenantOwnerIds = new Set(
    (tenants as Record<string, unknown>[]).map((tenant) => String(tenant.ownerId)),
  );
  const membershipOwnerIds = new Set(
    (memberships as Record<string, unknown>[]).map((membership) =>
      String(membership.authUserId),
    ),
  );

  const findings = ownerIds.flatMap((ownerId) => {
    const hasTenant = tenantOwnerIds.has(ownerId);
    const hasOwnerMembership = membershipOwnerIds.has(ownerId);
    if (hasTenant && hasOwnerMembership) return [];

    return [
      makeFinding({
        checkKey: KEY,
        severity: "warning",
        subject: { model: "AuthUser", id: ownerId },
        message:
          "OWNER platformski nalog nema odgovarajući Tenant i OWNER TenantUser zapis.",
        evidence: { hasTenant, hasOwnerMembership },
        repair: { action: "manual_orphan_owner_investigation" },
      }),
    ];
  });

  return { findings, scanned: ownerIds.length };
};
