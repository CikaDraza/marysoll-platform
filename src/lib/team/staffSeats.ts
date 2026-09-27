import "server-only";

import { connectToDB } from "@/lib/db/mongodb";
import { resolveTenantPlanFeatures } from "@/lib/plans/planEnforcement";
import { isValidPlanLimit, type PlanName } from "@/lib/plans/planFeatures";
import {
  TenantUser,
  type TenantUserRole,
  type TenantUserStatus,
} from "@/models/TenantUser";

export const TEAM_SEAT_ROLES = ["ADMIN", "STAFF"] as const;
export const TEAM_SEAT_STATUSES = ["active", "invited"] as const;

export interface TeamSeatMemberState {
  role: TenantUserRole;
  status: TenantUserStatus;
}

export interface TeamSeatSnapshot {
  plan: PlanName;
  used: number;
  limit: number;
  remaining: number | null;
  unlimited: boolean;
  canAdd: boolean;
}

export class TeamSeatLimitError extends Error {
  readonly code = "TEAM_SEAT_LIMIT_REACHED";

  constructor(
    readonly snapshot: TeamSeatSnapshot,
    readonly requestedSeats: number,
  ) {
    super(
      `Team seat limit je dostignut (${snapshot.used}/${snapshot.limit}).`,
    );
    this.name = "TeamSeatLimitError";
  }
}

export class TeamSeatConfigurationError extends Error {
  readonly code = "TEAM_SEAT_LIMIT_INVALID";

  constructor(readonly limit: unknown) {
    super("Efektivni staffMembers limit nije validan.");
    this.name = "TeamSeatConfigurationError";
  }
}

/**
 * Jedini v1 kriterijum za zauzimanje team seat-a.
 *
 * OWNER se ne računa. USER/GUEST nisu team članovi. Poziv zauzima mesto čim
 * postoji kao invited ADMIN/STAFF, a suspenzija ga oslobađa.
 */
export function consumesTeamSeat(
  member: TeamSeatMemberState | null | undefined,
): boolean {
  if (!member) return false;
  return (
    (TEAM_SEAT_ROLES as readonly TenantUserRole[]).includes(member.role) &&
    (TEAM_SEAT_STATUSES as readonly TenantUserStatus[]).includes(member.status)
  );
}

/**
 * Koliko dodatnih seat-ova troši prelaz. Koristi se i za novi invite
 * (`previous=null`) i za reaktivaciju suspendovanog člana.
 */
export function teamSeatDelta(
  previous: TeamSeatMemberState | null | undefined,
  next: TeamSeatMemberState | null | undefined,
): -1 | 0 | 1 {
  const before = consumesTeamSeat(previous) ? 1 : 0;
  const after = consumesTeamSeat(next) ? 1 : 0;
  return (after - before) as -1 | 0 | 1;
}

/**
 * Broji isti skup za svaki budući invite/reactivate/UI potrošač.
 */
export async function countTeamSeats(tenantId: string): Promise<number> {
  await connectToDB();
  return TenantUser.countDocuments({
    tenantId,
    role: { $in: TEAM_SEAT_ROLES },
    status: { $in: TEAM_SEAT_STATUSES },
  });
}

/**
 * Read model team entitlement-a. Plan i override dolaze isključivo iz
 * postojećeg effective-plan resolvera; nema lokalnog mapiranja planova.
 */
export async function resolveTeamSeatSnapshot(
  tenantId: string,
): Promise<TeamSeatSnapshot> {
  const [{ plan, features }, used] = await Promise.all([
    resolveTenantPlanFeatures(tenantId),
    countTeamSeats(tenantId),
  ]);
  const limit = features.staffMembers;
  if (!isValidPlanLimit(limit)) {
    throw new TeamSeatConfigurationError(limit);
  }

  const unlimited = limit === -1;
  const remaining = unlimited ? null : Math.max(limit - used, 0);

  return {
    plan,
    used,
    limit,
    remaining,
    unlimited,
    canAdd: unlimited || used < limit,
  };
}

/**
 * Server precondition za write koji dodaje seat. STAFF-2/3 mutacije moraju
 * pozvati ovaj authority; browser prikaz limita nije bezbednosni gate.
 */
export async function assertTeamSeatCapacity(
  tenantId: string,
  requestedSeats = 1,
): Promise<TeamSeatSnapshot> {
  if (!Number.isInteger(requestedSeats) || requestedSeats < 1) {
    throw new RangeError("requestedSeats mora biti pozitivan ceo broj.");
  }

  const snapshot = await resolveTeamSeatSnapshot(tenantId);
  if (
    !snapshot.unlimited &&
    snapshot.used + requestedSeats > snapshot.limit
  ) {
    throw new TeamSeatLimitError(snapshot, requestedSeats);
  }
  return snapshot;
}

/**
 * Centralna provera membership prelaza. Reaktivacija suspended ADMIN/STAFF
 * zato prolazi isti limit kao novi invite; democija/suspenzija ne traže mesto.
 */
export async function assertTeamSeatTransitionCapacity(params: {
  tenantId: string;
  previous?: TeamSeatMemberState | null;
  next?: TeamSeatMemberState | null;
}): Promise<TeamSeatSnapshot | null> {
  const delta = teamSeatDelta(params.previous, params.next);
  if (delta <= 0) return null;
  return assertTeamSeatCapacity(params.tenantId, delta);
}
