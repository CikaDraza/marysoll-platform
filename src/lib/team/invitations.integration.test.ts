import mongoose, { Types } from "mongoose";
import bcrypt from "bcryptjs";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Tenant } from "@/models/Tenant";
import { TenantUser } from "@/models/TenantUser";
import { Subscription } from "@/models/Subscription";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/mongodb", () => ({
  connectToDB: vi.fn(async () => mongoose),
}));

import {
  acceptTeamInvite,
  createTeamInvite,
  resendTeamInvite,
} from "./invitations";
import { hashTeamInviteToken } from "./inviteTokens";
import { tenantMembershipSessionDenial } from "@/lib/auth/tenantMembership";

let replSet: MongoMemoryReplSet;

async function seedTenant(options?: {
  plan?: "maria" | "enterprise";
  paid?: boolean;
}) {
  const ownerId = new Types.ObjectId();
  const suffix = new Types.ObjectId().toString();
  const tenant = await Tenant.create({
    name: `Salon ${suffix}`,
    slug: `salon-${suffix}`,
    subdomain: `salon-${suffix}`,
    ownerId,
    cloudinaryFolder: `salon-${suffix}`,
    verticals: ["beauty"],
    capabilityConfiguration: { overrides: [] },
    status: "active",
    plan: options?.plan ?? "maria",
    paid: options?.paid ?? false,
    planExpiresAt: options?.paid
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : null,
  });
  const owner = await TenantUser.create({
    tenantId: tenant._id,
    email: `owner-${suffix}@test.local`,
    password: await bcrypt.hash("Owner-password-1", 4),
    isEmailVerified: true,
    name: "Vlasnica",
    role: "OWNER",
    status: "active",
  });
  return { tenant, owner };
}

function inviteInput(
  tenantId: Types.ObjectId,
  ownerId: Types.ObjectId,
  suffix = new Types.ObjectId().toString(),
) {
  return {
    tenantId: String(tenantId),
    actorTenantUserId: String(ownerId),
    name: `Član ${suffix}`,
    email: `staff-${suffix}@test.local`,
  };
}

describe.sequential("STAFF-2 atomic invitation lifecycle", () => {
  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
    await mongoose.connect(replSet.getUri(), { dbName: "staff-team-invite" });
    await Promise.all([
      Tenant.syncIndexes(),
      TenantUser.syncIndexes(),
      Subscription.syncIndexes(),
    ]);
  }, 90_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet?.stop();
  });

  beforeEach(async () => {
    await Promise.all([
      TenantUser.deleteMany({}),
      Subscription.deleteMany({}),
      Tenant.deleteMany({}),
    ]);
  });

  it("uvek kreira samo STAFF/invited i u bazi čuva hash, ne raw token", async () => {
    const { tenant, owner } = await seedTenant();
    const invitation = await createTeamInvite(
      inviteInput(tenant._id, owner._id),
    );

    expect(invitation).toMatchObject({ role: "STAFF", status: "invited" });
    const member = await TenantUser.findById(invitation.memberId)
      .select("+invitationTokenHash password role status isEmailVerified")
      .lean<{
        invitationTokenHash: string;
        password: string;
        role: string;
        status: string;
        isEmailVerified: boolean;
      }>();
    expect(member).toMatchObject({
      role: "STAFF",
      status: "invited",
      isEmailVerified: false,
      invitationTokenHash: hashTeamInviteToken(invitation.rawToken),
    });
    expect(member?.invitationTokenHash).not.toBe(invitation.rawToken);
    await expect(bcrypt.compare(invitation.rawToken, member!.password)).resolves.toBe(false);
  });

  it.each([
    ["USER", "active", "TEAM_EMAIL_ALREADY_CLIENT"],
    ["GUEST", "active", "TEAM_EMAIL_ALREADY_CLIENT"],
    ["STAFF", "active", "TEAM_MEMBER_ALREADY_ACTIVE"],
    ["ADMIN", "active", "TEAM_MEMBER_ALREADY_ACTIVE"],
    ["STAFF", "invited", "TEAM_INVITE_ALREADY_EXISTS"],
    ["ADMIN", "suspended", "TEAM_MEMBER_SUSPENDED"],
  ] as const)(
    "postojeći %s/%s daje stabilan %s odgovor",
    async (role, status, code) => {
      const { tenant, owner } = await seedTenant({ plan: "enterprise", paid: true });
      const input = inviteInput(tenant._id, owner._id);
      await TenantUser.create({
        tenantId: tenant._id,
        email: input.email,
        password: "unknown-hash",
        isEmailVerified: status !== "invited",
        name: "Postojeći nalog",
        role,
        status,
      });

      await expect(createTeamInvite(input)).rejects.toMatchObject({ code });
      await expect(
        TenantUser.countDocuments({ tenantId: tenant._id, email: input.email }),
      ).resolves.toBe(1);
    },
  );

  it("isti email je tenant-isolated, a resend ne može preći tenant granicu", async () => {
    const first = await seedTenant();
    const second = await seedTenant();
    const email = `shared-${new Types.ObjectId()}@test.local`;
    const firstInvite = await createTeamInvite({
      ...inviteInput(first.tenant._id, first.owner._id),
      email,
    });
    await expect(
      createTeamInvite({
        ...inviteInput(second.tenant._id, second.owner._id),
        email,
      }),
    ).resolves.toMatchObject({ email });
    await expect(
      resendTeamInvite({
        tenantId: String(second.tenant._id),
        actorTenantUserId: String(second.owner._id),
        memberId: firstInvite.memberId,
      }),
    ).rejects.toMatchObject({ code: "TEAM_MEMBER_STATE_CONFLICT" });
  });

  it("paralelni zahtevi za poslednji maria seat: tačno jedan uspeva", async () => {
    const { tenant, owner } = await seedTenant();
    const results = await Promise.allSettled([
      createTeamInvite(inviteInput(tenant._id, owner._id, "parallel-a")),
      createTeamInvite(inviteInput(tenant._id, owner._id, "parallel-b")),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected).toMatchObject({
      status: "rejected",
      reason: { code: "TEAM_SEAT_LIMIT_REACHED" },
    });
    await expect(
      TenantUser.countDocuments({
        tenantId: tenant._id,
        role: "STAFF",
        status: "invited",
      }),
    ).resolves.toBe(1);
  });

  it("paralelni dupli email ostavlja jedan zapis i stabilan domain error", async () => {
    const { tenant, owner } = await seedTenant({ plan: "enterprise", paid: true });
    const input = inviteInput(tenant._id, owner._id, "same-email");
    const results = await Promise.allSettled([
      createTeamInvite(input),
      createTeamInvite(input),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      reason: { code: "TEAM_INVITE_ALREADY_EXISTS" },
    });
    await expect(
      TenantUser.countDocuments({ tenantId: tenant._id, email: input.email }),
    ).resolves.toBe(1);
  });

  it("poštuje aktivni staffMembers override i enterprise unlimited", async () => {
    const limited = await seedTenant();
    await Subscription.create({
      tenantId: limited.tenant._id,
      plan: "maria",
      status: "active",
      featureOverrides: { staffMembers: 2 },
      overrideExpiresAt: new Date(Date.now() + 60_000),
    });
    await expect(
      Promise.all([
        createTeamInvite(inviteInput(limited.tenant._id, limited.owner._id, "override-a")),
        createTeamInvite(inviteInput(limited.tenant._id, limited.owner._id, "override-b")),
      ]),
    ).resolves.toHaveLength(2);

    const unlimited = await seedTenant({ plan: "enterprise", paid: true });
    const unlimitedInvites = [];
    for (let index = 0; index < 12; index += 1) {
      unlimitedInvites.push(
        await createTeamInvite(
          inviteInput(unlimited.tenant._id, unlimited.owner._id, `unlimited-${index}`),
        ),
      );
    }
    expect(unlimitedInvites).toHaveLength(12);
  });

  it("validan token aktivira nalog jednom i postavlja novu lozinku", async () => {
    const { tenant, owner } = await seedTenant();
    const invitation = await createTeamInvite(inviteInput(tenant._id, owner._id));
    await expect(
      acceptTeamInvite({ rawToken: invitation.rawToken, password: "Nova-lozinka-1" }),
    ).resolves.toMatchObject({ memberId: invitation.memberId });

    const active = await TenantUser.findById(invitation.memberId)
      .select("+invitationTokenHash password status isEmailVerified invitationExpiresAt")
      .lean<{
        password: string;
        status: string;
        isEmailVerified: boolean;
        invitationTokenHash?: string;
        invitationExpiresAt?: Date;
      }>();
    expect(active).toMatchObject({ status: "active", isEmailVerified: true });
    expect(tenantMembershipSessionDenial(active!)).toBeNull();
    expect(active?.invitationTokenHash).toBeUndefined();
    expect(active?.invitationExpiresAt).toBeUndefined();
    await expect(bcrypt.compare("Nova-lozinka-1", active!.password)).resolves.toBe(true);
    await expect(
      acceptTeamInvite({ rawToken: invitation.rawToken, password: "Druga-lozinka-1" }),
    ).rejects.toMatchObject({ code: "TEAM_INVITE_ALREADY_USED" });
  });

  it("pogrešan i istekao token ne menjaju članstvo", async () => {
    const { tenant, owner } = await seedTenant();
    const invitation = await createTeamInvite(inviteInput(tenant._id, owner._id));
    await expect(
      acceptTeamInvite({ rawToken: "wrong-token", password: "Nova-lozinka-1" }),
    ).rejects.toMatchObject({ code: "TEAM_INVITE_ALREADY_USED" });

    await TenantUser.updateOne(
      { _id: invitation.memberId },
      { $set: { invitationExpiresAt: new Date(Date.now() - 1000) } },
    );
    await expect(
      acceptTeamInvite({ rawToken: invitation.rawToken, password: "Nova-lozinka-1" }),
    ).rejects.toMatchObject({ code: "TEAM_INVITE_EXPIRED" });
    await expect(
      TenantUser.findById(invitation.memberId).distinct("status"),
    ).resolves.toContain("invited");
  });

  it("resend ne troši novi seat, poništava stari token i novi radi", async () => {
    const { tenant, owner } = await seedTenant();
    const first = await createTeamInvite(inviteInput(tenant._id, owner._id));
    const second = await resendTeamInvite({
      tenantId: String(tenant._id),
      actorTenantUserId: String(owner._id),
      memberId: first.memberId,
    });
    expect(second.rawToken).not.toBe(first.rawToken);
    await expect(
      acceptTeamInvite({ rawToken: first.rawToken, password: "Nova-lozinka-1" }),
    ).rejects.toMatchObject({ code: "TEAM_INVITE_ALREADY_USED" });
    await expect(
      acceptTeamInvite({ rawToken: second.rawToken, password: "Nova-lozinka-1" }),
    ).resolves.toMatchObject({ memberId: first.memberId });
  });

  it("accept fail-closed blokira poziv ako downgrade ostavi tenant preko limita", async () => {
    const { tenant, owner } = await seedTenant({ plan: "enterprise", paid: true });
    const first = await createTeamInvite(inviteInput(tenant._id, owner._id, "down-a"));
    await createTeamInvite(inviteInput(tenant._id, owner._id, "down-b"));
    await Tenant.updateOne(
      { _id: tenant._id },
      { $set: { paid: false, plan: "maria", planExpiresAt: null } },
    );
    await expect(
      acceptTeamInvite({ rawToken: first.rawToken, password: "Nova-lozinka-1" }),
    ).rejects.toMatchObject({ code: "TEAM_SEAT_LIMIT_REACHED" });
  });
});
