import "server-only";

import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import type {
  TeamMemberRole,
  TeamMemberStatus,
  TeamOverview,
} from "@/types/team";
import { resolveTeamSeatSnapshot } from "./staffSeats";

interface TeamMemberRow {
  _id: { toString(): string };
  name: string;
  email: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  isEmailVerified: boolean;
  invitedAt?: Date | null;
  createdAt: Date;
}

const ROLE_ORDER: Record<TeamMemberRole, number> = {
  OWNER: 0,
  ADMIN: 1,
  STAFF: 2,
};

const STATUS_ORDER: Record<TeamMemberStatus, number> = {
  active: 0,
  invited: 1,
  suspended: 2,
};

/** Owner-only browser projection. Never add credential or raw invite fields. */
export async function getTeamOverview(tenantId: string): Promise<TeamOverview> {
  await connectToDB();
  const [snapshot, rows] = await Promise.all([
    resolveTeamSeatSnapshot(tenantId),
    TenantUser.find({
      tenantId,
      role: { $in: ["OWNER", "ADMIN", "STAFF"] },
    })
      .select("_id name email role status isEmailVerified invitedAt createdAt")
      .lean<TeamMemberRow[]>(),
  ]);

  rows.sort((left, right) => {
    const roleDifference = ROLE_ORDER[left.role] - ROLE_ORDER[right.role];
    if (roleDifference !== 0) return roleDifference;
    const statusDifference =
      STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
    if (statusDifference !== 0) return statusDifference;
    return left.name.localeCompare(right.name, "sr-Latn");
  });

  return {
    plan: snapshot.plan,
    seats: {
      used: snapshot.used,
      limit: snapshot.limit,
      remaining: snapshot.remaining,
      unlimited: snapshot.unlimited,
      canAdd: snapshot.canAdd,
    },
    members: rows.map((member) => ({
      id: member._id.toString(),
      name: member.name,
      email: member.email,
      role: member.role,
      status: member.status,
      isEmailVerified: member.isEmailVerified,
      invitedAt: member.invitedAt?.toISOString() ?? null,
      createdAt: member.createdAt.toISOString(),
    })),
  };
}
