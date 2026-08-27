import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/models/AuthUser", () => ({
  AuthUser: { exists: vi.fn(), find: vi.fn() },
}));
vi.mock("@/models/Tenant", () => ({
  Tenant: { findById: vi.fn(), find: vi.fn() },
}));
vi.mock("@/models/TenantUser", () => ({
  TenantUser: { find: vi.fn() },
}));

import { AuthUser } from "@/models/AuthUser";
import { Tenant } from "@/models/Tenant";
import { TenantUser } from "@/models/TenantUser";
import { collectTenantOwnershipMissing } from "./tenantOwnershipMissing";
import { collectPlatformOrphanOwners } from "./platformOrphanOwners";

function leanResult(value: unknown) {
  return { select: () => ({ lean: async () => value }) };
}

beforeEach(() => vi.clearAllMocks());

describe("collectTenantOwnershipMissing", () => {
  it("zdrav je samo isti postojeći AuthUser + jedini OWNER membership", async () => {
    vi.mocked(Tenant.findById).mockReturnValue(leanResult({ ownerId: "owner-1" }) as never);
    vi.mocked(TenantUser.find).mockReturnValue(
      leanResult([{ authUserId: "owner-1" }]) as never,
    );
    vi.mocked(AuthUser.exists).mockResolvedValue({ _id: "owner-1" } as never);

    const result = await collectTenantOwnershipMissing({
      tenantId: "tenant-1",
      loaders: {} as never,
    });

    expect(result).toEqual({ findings: [], scanned: 1 });
  });

  it("prijavljuje poklopljene ID-eve kada stvarni AuthUser ne postoji", async () => {
    vi.mocked(Tenant.findById).mockReturnValue(leanResult({ ownerId: "owner-1" }) as never);
    vi.mocked(TenantUser.find).mockReturnValue(
      leanResult([{ authUserId: "owner-1" }]) as never,
    );
    vi.mocked(AuthUser.exists).mockResolvedValue(null);

    const result = await collectTenantOwnershipMissing({
      tenantId: "tenant-1",
      loaders: {} as never,
    });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      checkKey: "tenant.ownership.missing",
      subject: { model: "Tenant", id: "tenant-1" },
      evidence: { ownerAuthUserExists: false, ownerMembershipCount: 1 },
    });
  });
});

describe("collectPlatformOrphanOwners", () => {
  it("nalaz ostaje na AuthUser subject-u i ne dobija izmišljeni tenantId", async () => {
    vi.mocked(AuthUser.find).mockReturnValue(
      leanResult([{ _id: "healthy" }, { _id: "orphan" }]) as never,
    );
    vi.mocked(Tenant.find).mockReturnValue(
      leanResult([{ ownerId: "healthy" }]) as never,
    );
    vi.mocked(TenantUser.find).mockReturnValue(
      leanResult([{ authUserId: "healthy" }]) as never,
    );

    const result = await collectPlatformOrphanOwners();

    expect(result.scanned).toBe(2);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      checkKey: "tenant.ownership.orphanAccount",
      subject: { model: "AuthUser", id: "orphan" },
      evidence: { hasTenant: false, hasOwnerMembership: false },
    });
    expect(result.findings[0].evidence).not.toHaveProperty("tenantId");
  });
});
