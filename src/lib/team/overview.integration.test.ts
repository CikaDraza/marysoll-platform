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

const resolveTeamSeatSnapshot = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/mongodb", () => ({
  connectToDB: vi.fn(async () => mongoose),
}));
vi.mock("./staffSeats", () => ({
  resolveTeamSeatSnapshot: (...args: unknown[]) =>
    resolveTeamSeatSnapshot(...args),
}));

import { getTeamOverview } from "./overview";

let mongo: MongoMemoryServer;
const TENANT_ID = new Types.ObjectId();

async function seedMember(input: {
  role: "OWNER" | "ADMIN" | "STAFF" | "USER";
  status: "active" | "invited" | "suspended";
  name: string;
  email: string;
}) {
  return TenantUser.create({
    tenantId: TENANT_ID,
    email: input.email,
    password: "sensitive-password-hash",
    isEmailVerified: input.status === "active",
    invitationTokenHash:
      input.status === "invited"
        ? new Types.ObjectId().toString().padEnd(64, "0")
        : null,
    invitationExpiresAt:
      input.status === "invited" ? new Date(Date.now() + 60_000) : null,
    invitedAt: input.status === "invited" ? new Date() : null,
    name: input.name,
    role: input.role,
    status: input.status,
  });
}

describe.sequential("STAFF-3 Team overview projection", () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: "staff-team-overview" });
  }, 90_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
  });

  beforeEach(async () => {
    await TenantUser.deleteMany({});
    resolveTeamSeatSnapshot.mockResolvedValue({
      plan: "kiki",
      used: 2,
      limit: 10,
      remaining: 8,
      unlimited: false,
      canAdd: true,
    });
  });

  it("vraća effective Kiki seat snapshot i samo management članove", async () => {
    await Promise.all([
      seedMember({
        role: "STAFF",
        status: "invited",
        name: "Zorana",
        email: "zorana@test.local",
      }),
      seedMember({
        role: "OWNER",
        status: "active",
        name: "Ana",
        email: "ana@test.local",
      }),
      seedMember({
        role: "ADMIN",
        status: "active",
        name: "Milica",
        email: "milica@test.local",
      }),
      seedMember({
        role: "USER",
        status: "active",
        name: "Klijentkinja",
        email: "client@test.local",
      }),
    ]);

    const overview = await getTeamOverview(String(TENANT_ID));
    expect(overview).toMatchObject({
      plan: "kiki",
      seats: { used: 2, limit: 10, remaining: 8, canAdd: true },
    });
    expect(overview.members.map((member) => member.role)).toEqual([
      "OWNER",
      "ADMIN",
      "STAFF",
    ]);
    expect(overview.members.map((member) => member.email)).not.toContain(
      "client@test.local",
    );
  });

  it("nikada ne projektuje password ili invitation token", async () => {
    await seedMember({
      role: "STAFF",
      status: "invited",
      name: "Marija",
      email: "marija@test.local",
    });
    const overview = await getTeamOverview(String(TENANT_ID));
    const serialized = JSON.stringify(overview);
    expect(serialized).not.toContain("sensitive-password-hash");
    expect(serialized).not.toContain("invitationTokenHash");
    expect(Object.keys(overview.members[0])).toEqual([
      "id",
      "name",
      "email",
      "role",
      "status",
      "isEmailVerified",
      "invitedAt",
      "createdAt",
    ]);
  });
});
