import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { TenantUser } from "@/models/TenantUser";
import {
  generateAccessToken,
  requireAdmin,
  requireBackofficeMember,
  requireOwner,
  requireSalonOperator,
  verifyToken,
  type AdminAuthResult,
} from "./auth-server";
import type { TenantRole } from "./roles";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: async () => undefined }));

let mongo: MongoMemoryServer;

const TENANT_A = new Types.ObjectId();
const TENANT_B = new Types.ObjectId();

async function seedMember(
  role: TenantRole,
  status: "active" | "invited" | "suspended" = "active",
) {
  return TenantUser.create({
    tenantId: TENANT_A,
    email: `${role.toLowerCase()}-${new Types.ObjectId()}@example.com`,
    password: "hashed-password",
    isEmailVerified: true,
    status,
    name: role,
    role,
  });
}

function tokenFor(
  member: { _id: Types.ObjectId; email: string; name: string; role: TenantRole },
  options?: {
    tenantId?: Types.ObjectId;
    /** Dokazuje da server ne veruje starom JWT admin claim-u. */
    isAdminClaim?: boolean;
  },
) {
  const tenantId = options?.tenantId ?? TENANT_A;
  return generateAccessToken(
    String(member._id),
    member.email,
    options?.isAdminClaim ?? ["OWNER", "ADMIN"].includes(member.role),
    member.name,
    String(member._id),
    String(tenantId),
    false,
    member.role,
    "test-salon",
    "tenant",
  );
}

function requestWith(
  token: string,
  requestTenantId: Types.ObjectId = TENANT_A,
): Request {
  return new Request("http://localhost/api/protected", {
    headers: {
      authorization: `Bearer ${token}`,
      "x-tenant-id": String(requestTenantId),
    },
  });
}

async function expectAllowed(result: Promise<AdminAuthResult>) {
  expect((await result).success).toBe(true);
}

async function expectDenied(
  result: Promise<AdminAuthResult>,
  code: string,
) {
  const auth = await result;
  expect(auth.success).toBe(false);
  if (auth.success) return;
  expect(auth.response.status).toBe(403);
  await expect(auth.response.json()).resolves.toMatchObject({ code });
}

describe.sequential("STAFF-0 server authority", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = "staff-authorization-test-secret";
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), {
      dbName: "staff-authorization-test",
    });
  }, 90_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
  });

  beforeEach(async () => {
    await TenantUser.deleteMany({});
  });

  it("OWNER prolazi owner, admin, operator i backoffice gate", async () => {
    const member = await seedMember("OWNER");
    const token = tokenFor(member);

    await expectAllowed(requireOwner(requestWith(token)));
    await expectAllowed(requireAdmin(requestWith(token)));
    await expectAllowed(requireSalonOperator(requestWith(token)));
    await expectAllowed(requireBackofficeMember(requestWith(token)));
  });

  it("ADMIN prolazi admin/operator/backoffice, ali ne owner", async () => {
    const member = await seedMember("ADMIN");
    const token = tokenFor(member);

    await expectAllowed(requireAdmin(requestWith(token)));
    await expectAllowed(requireSalonOperator(requestWith(token)));
    await expectAllowed(requireBackofficeMember(requestWith(token)));
    await expectDenied(requireOwner(requestWith(token)), "OWNER_REQUIRED");
  });

  it("STAFF prolazi operator/backoffice, ali nikad admin/owner", async () => {
    const member = await seedMember("STAFF");
    // Legacy 30-day token iz starog sistema jos tvrdi isAdmin=true.
    const staleClaimToken = tokenFor(member, { isAdminClaim: true });
    expect(verifyToken(staleClaimToken)?.isAdmin).toBe(false);

    await expectAllowed(requireSalonOperator(requestWith(staleClaimToken)));
    await expectAllowed(requireBackofficeMember(requestWith(staleClaimToken)));
    await expectDenied(
      requireAdmin(requestWith(staleClaimToken)),
      "STAFF_READ_ONLY",
    );
    await expectDenied(
      requireOwner(requestWith(staleClaimToken)),
      "OWNER_REQUIRED",
    );
  });

  it.each(["USER", "GUEST"] as const)(
    "%s ne prolazi nijedan backoffice gate",
    async (role) => {
      const member = await seedMember(role);
      const token = tokenFor(member);

      await expectDenied(
        requireBackofficeMember(requestWith(token)),
        "ROLE_FORBIDDEN",
      );
      await expectDenied(
        requireSalonOperator(requestWith(token)),
        "ROLE_FORBIDDEN",
      );
      await expectDenied(requireAdmin(requestWith(token)), "ROLE_FORBIDDEN");
      await expectDenied(requireOwner(requestWith(token)), "OWNER_REQUIRED");
    },
  );

  it("suspendovan STAFF ne prolazi ni sa starim validnim JWT-om", async () => {
    const member = await seedMember("STAFF");
    const staleToken = tokenFor(member, { isAdminClaim: true });
    await TenantUser.updateOne(
      { _id: member._id },
      { $set: { status: "suspended" } },
    );

    await expectDenied(
      requireBackofficeMember(requestWith(staleToken)),
      "MEMBERSHIP_INACTIVE",
    );
    await expectDenied(
      requireSalonOperator(requestWith(staleToken)),
      "MEMBERSHIP_INACTIVE",
    );
  });

  it("cross-tenant STAFF ne moze pristupiti drugom salonu", async () => {
    const member = await seedMember("STAFF");
    const token = tokenFor(member, { isAdminClaim: true });

    await expectDenied(
      requireSalonOperator(requestWith(token, TENANT_B)),
      "TENANT_MISMATCH",
    );
  });

  it("falsifikovan tenant claim ne nalazi clanstvo u drugom salonu", async () => {
    const member = await seedMember("STAFF");
    const wrongTenantToken = tokenFor(member, {
      tenantId: TENANT_B,
      isAdminClaim: true,
    });

    await expectDenied(
      requireSalonOperator(requestWith(wrongTenantToken, TENANT_B)),
      "MEMBERSHIP_INACTIVE",
    );
  });
});
