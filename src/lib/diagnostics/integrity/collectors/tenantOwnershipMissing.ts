import "server-only";

import { AuthUser } from "@/models/AuthUser";
import { Tenant } from "@/models/Tenant";
import { TenantUser } from "@/models/TenantUser";
import { makeFinding } from "@/lib/platform/diagnostic-client";
import type { IntegrityCollector } from "./types";

const KEY = "tenant.ownership.missing";

export const collectTenantOwnershipMissing: IntegrityCollector = async (ctx) => {
  const [rawTenant, ownerMemberships] = await Promise.all([
    Tenant.findById(ctx.tenantId).select("ownerId").lean(),
    TenantUser.find({ tenantId: ctx.tenantId, role: "OWNER" })
      .select("authUserId")
      .lean(),
  ]);
  const tenant = rawTenant as unknown as { ownerId?: unknown } | null;

  const ownerId = tenant?.ownerId ? String(tenant.ownerId) : null;
  const ownerAuthUserExists = ownerId
    ? Boolean(await AuthUser.exists({ _id: ownerId }))
    : false;
  const membershipIds = (ownerMemberships as Record<string, unknown>[]).map((row) =>
    row.authUserId ? String(row.authUserId) : null,
  );
  const healthy =
    Boolean(tenant) &&
    Boolean(ownerId) &&
    ownerAuthUserExists &&
    membershipIds.length === 1 &&
    Boolean(membershipIds[0]) &&
    membershipIds[0] === ownerId;

  if (healthy) {
    return { findings: [], scanned: 1 };
  }

  return {
    findings: [
      makeFinding({
        checkKey: KEY,
        severity: "error",
        subject: { model: "Tenant", id: ctx.tenantId },
        message:
          "Salon nema dokazivog vlasnika: Tenant.ownerId, jedini OWNER TenantUser.authUserId i postojeći AuthUser._id moraju biti isti.",
        evidence: {
          tenantExists: Boolean(tenant),
          tenantOwnerId: ownerId,
          ownerAuthUserExists,
          ownerMembershipCount: membershipIds.length,
          ownerMembershipAuthUserIds: membershipIds,
        },
        repair: { action: "manual_ownership_investigation" },
      }),
    ],
    scanned: tenant ? 1 : 0,
  };
};
