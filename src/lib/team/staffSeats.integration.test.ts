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
import { getPlanFeatures } from "@/lib/plans/planFeatures";
import { TenantUser } from "@/models/TenantUser";

const resolveTenantPlanFeatures = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/mongodb", () => ({
  connectToDB: vi.fn(async () => undefined),
}));
vi.mock("@/lib/plans/planEnforcement", () => ({
  resolveTenantPlanFeatures: (...args: unknown[]) =>
    resolveTenantPlanFeatures(...args),
}));

import {
  TeamSeatConfigurationError,
  TeamSeatLimitError,
  assertTeamSeatCapacity,
  assertTeamSeatTransitionCapacity,
  consumesTeamSeat,
  countTeamSeats,
  resolveTeamSeatSnapshot,
  teamSeatDelta,
  type TeamSeatMemberState,
} from "./staffSeats";

let mongo: MongoMemoryServer;
const TENANT_ID = new Types.ObjectId();

async function seedMember(
  role: TeamSeatMemberState["role"],
  status: TeamSeatMemberState["status"],
) {
  return TenantUser.create({
    tenantId: TENANT_ID,
    email: `${role.toLowerCase()}-${status}-${new Types.ObjectId()}@test.local`,
    password: "hashed-password",
    isEmailVerified: status !== "invited",
    name: `${role} ${status}`,
    role,
    status,
  });
}

function effectiveStaffLimit(limit: number) {
  resolveTenantPlanFeatures.mockResolvedValue({
    plan: "maria",
    features: getPlanFeatures("maria", { staffMembers: limit }),
  });
}

describe.sequential("STAFF-1 team seat policy", () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: "staff-team-limit" });
  }, 90_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await TenantUser.deleteMany({});
    effectiveStaffLimit(1);
  });

  it.each([
    ["OWNER", "active", false],
    ["OWNER", "invited", false],
    ["ADMIN", "active", true],
    ["ADMIN", "invited", true],
    ["ADMIN", "suspended", false],
    ["STAFF", "active", true],
    ["STAFF", "invited", true],
    ["STAFF", "suspended", false],
    ["USER", "active", false],
    ["GUEST", "active", false],
  ] as const)(
    "%s/%s consumes seat=%s",
    (role, status, expected) => {
      expect(consumesTeamSeat({ role, status })).toBe(expected);
    },
  );

  it("računa samo active/invited ADMIN i STAFF", async () => {
    await Promise.all([
      seedMember("OWNER", "active"),
      seedMember("ADMIN", "active"),
      seedMember("STAFF", "invited"),
      seedMember("STAFF", "suspended"),
      seedMember("USER", "active"),
      seedMember("GUEST", "active"),
    ]);

    await expect(countTeamSeats(String(TENANT_ID))).resolves.toBe(2);
  });

  it("koristi efektivni staffMembers override bez hardkodovanja plana", async () => {
    await Promise.all([
      seedMember("ADMIN", "active"),
      seedMember("STAFF", "invited"),
    ]);
    effectiveStaffLimit(3);

    await expect(resolveTeamSeatSnapshot(String(TENANT_ID))).resolves.toEqual({
      plan: "maria",
      used: 2,
      limit: 3,
      remaining: 1,
      unlimited: false,
      canAdd: true,
    });
    expect(resolveTenantPlanFeatures).toHaveBeenCalledWith(String(TENANT_ID));
  });

  it("-1 predstavlja unlimited", async () => {
    await Promise.all([
      seedMember("ADMIN", "active"),
      seedMember("STAFF", "invited"),
      seedMember("STAFF", "active"),
    ]);
    effectiveStaffLimit(-1);

    await expect(resolveTeamSeatSnapshot(String(TENANT_ID))).resolves.toEqual({
      plan: "maria",
      used: 3,
      limit: -1,
      remaining: null,
      unlimited: true,
      canAdd: true,
    });
    await expect(
      assertTeamSeatCapacity(String(TENANT_ID), 100),
    ).resolves.toMatchObject({ unlimited: true });
  });

  it("odbija novi seat kada je limit dostignut", async () => {
    await seedMember("STAFF", "active");

    const error = await assertTeamSeatCapacity(String(TENANT_ID)).catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(TeamSeatLimitError);
    expect(error).toMatchObject({
      code: "TEAM_SEAT_LIMIT_REACHED",
      requestedSeats: 1,
      snapshot: { used: 1, limit: 1, canAdd: false },
    });
  });

  it("reaktivacija suspended člana ponovo proverava limit", async () => {
    await Promise.all([
      seedMember("ADMIN", "active"),
      seedMember("STAFF", "suspended"),
    ]);

    await expect(
      assertTeamSeatTransitionCapacity({
        tenantId: String(TENANT_ID),
        previous: { role: "STAFF", status: "suspended" },
        next: { role: "STAFF", status: "active" },
      }),
    ).rejects.toMatchObject({ code: "TEAM_SEAT_LIMIT_REACHED" });
  });

  it("invite zauzima seat, dok suspenzija i STAFF→ADMIN ne traže novi", async () => {
    expect(
      teamSeatDelta(null, { role: "STAFF", status: "invited" }),
    ).toBe(1);
    expect(
      teamSeatDelta(
        { role: "STAFF", status: "active" },
        { role: "STAFF", status: "suspended" },
      ),
    ).toBe(-1);
    expect(
      teamSeatDelta(
        { role: "STAFF", status: "active" },
        { role: "ADMIN", status: "active" },
      ),
    ).toBe(0);

    await expect(
      assertTeamSeatTransitionCapacity({
        tenantId: String(TENANT_ID),
        previous: { role: "STAFF", status: "active" },
        next: { role: "STAFF", status: "suspended" },
      }),
    ).resolves.toBeNull();
    expect(resolveTenantPlanFeatures).not.toHaveBeenCalled();
  });

  it("fail-closed odbija nevalidan efektivni limit", async () => {
    effectiveStaffLimit(-2);

    await expect(
      resolveTeamSeatSnapshot(String(TENANT_ID)),
    ).rejects.toBeInstanceOf(TeamSeatConfigurationError);
  });

  it("odbija nevalidan broj traženih seat-ova", async () => {
    await expect(
      assertTeamSeatCapacity(String(TENANT_ID), 0),
    ).rejects.toBeInstanceOf(RangeError);
    await expect(
      assertTeamSeatCapacity(String(TENANT_ID), 1.5),
    ).rejects.toBeInstanceOf(RangeError);
  });
});
