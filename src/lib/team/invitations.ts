import "server-only";

import { Types, type ClientSession } from "mongoose";
import { hashPasswordAndSyncAuthUser } from "@/lib/auth/passwordSync";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { TenantUser, type TenantUserRole } from "@/models/TenantUser";
import {
  TeamSeatLimitError,
  assertTeamSeatCapacity,
  resolveTeamSeatSnapshot,
} from "./staffSeats";
import { TeamInviteError, isMongoDuplicateKey } from "./errors";
import {
  createTeamInviteToken,
  createUnknownPlaceholderPassword,
  hashTeamInviteToken,
} from "./inviteTokens";
import { runTeamTransaction } from "./transaction";

interface TenantLock {
  _id: Types.ObjectId;
  name: string;
  slug: string;
}

export interface TeamInviteResult {
  memberId: string;
  email: string;
  name: string;
  role: "STAFF";
  status: "invited";
  rawToken: string;
  expiresAt: Date;
  tenantName: string;
  tenantSlug: string;
  inviterName: string | null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function lockTenant(
  tenantId: string,
  session: ClientSession,
): Promise<TenantLock> {
  const tenant = await Tenant.findOneAndUpdate(
    { _id: tenantId },
    { $inc: { teamMembershipRevision: 1 } },
    { new: true, session },
  )
    .select("name slug")
    .lean<TenantLock>();
  if (!tenant) {
    throw new TeamInviteError(
      "TEAM_TENANT_NOT_FOUND",
      "Salon nije pronađen.",
      404,
    );
  }
  return tenant;
}

function existingMemberError(member: {
  role: TenantUserRole;
  status: string;
}): TeamInviteError {
  if (member.role === "USER" || member.role === "GUEST") {
    return new TeamInviteError(
      "TEAM_EMAIL_ALREADY_CLIENT",
      "Ova email adresa već pripada klijentkinji salona.",
    );
  }
  if (member.status === "suspended") {
    return new TeamInviteError(
      "TEAM_MEMBER_SUSPENDED",
      "Član tima je suspendovan; koristite poseban reactivation tok.",
    );
  }
  if (member.status === "invited" && member.role === "STAFF") {
    return new TeamInviteError(
      "TEAM_INVITE_ALREADY_EXISTS",
      "Poziv za ovu email adresu već postoji.",
    );
  }
  if (member.status === "active") {
    return new TeamInviteError(
      "TEAM_MEMBER_ALREADY_ACTIVE",
      "Ova osoba je već aktivan član tima.",
    );
  }
  return new TeamInviteError(
    "TEAM_MEMBER_STATE_CONFLICT",
    "Postojeće članstvo nije u stanju pogodnom za novi poziv.",
  );
}

export async function createTeamInvite(input: {
  tenantId: string;
  actorTenantUserId: string;
  name: string;
  email: string;
}): Promise<TeamInviteResult> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  if (!email || !name || !email.includes("@")) {
    throw new TeamInviteError(
      "TEAM_INVITE_INVALID",
      "Ime i validna email adresa su obavezni.",
      400,
    );
  }
  if (!Types.ObjectId.isValid(input.actorTenantUserId)) {
    throw new TeamInviteError("TEAM_INVITE_INVALID", "Pozivalac nije validan.", 400);
  }

  const token = createTeamInviteToken();
  const placeholderPassword = await createUnknownPlaceholderPassword();

  try {
    return await runTeamTransaction(async (session) => {
      const tenant = await lockTenant(input.tenantId, session);
      const existing = await TenantUser.findOne({ tenantId: tenant._id, email })
        .select("role status")
        .session(session)
        .lean<{ role: TenantUserRole; status: string }>();
      if (existing) throw existingMemberError(existing);

      try {
        await assertTeamSeatCapacity(String(tenant._id), 1, session);
      } catch (error) {
        if (error instanceof TeamSeatLimitError) {
          throw new TeamInviteError(
            "TEAM_SEAT_LIMIT_REACHED",
            "Dostignut je limit članova tima za trenutni plan.",
          );
        }
        throw error;
      }

      const now = new Date();
      const [member] = await TenantUser.create(
        [
          {
            tenantId: tenant._id,
            email,
            name,
            password: placeholderPassword,
            isEmailVerified: false,
            role: "STAFF",
            status: "invited",
            invitationTokenHash: token.tokenHash,
            invitationExpiresAt: token.expiresAt,
            invitedAt: now,
            invitedByTenantUserId: new Types.ObjectId(input.actorTenantUserId),
          },
        ],
        { session },
      );
      const inviter = await TenantUser.findOne({
        _id: input.actorTenantUserId,
        tenantId: tenant._id,
      })
        .select("name")
        .session(session)
        .lean<{ name?: string }>();

      return {
        memberId: String(member._id),
        email,
        name,
        role: "STAFF" as const,
        status: "invited" as const,
        rawToken: token.rawToken,
        expiresAt: token.expiresAt,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        inviterName: inviter?.name?.trim() || null,
      };
    });
  } catch (error) {
    if (isMongoDuplicateKey(error)) {
      throw new TeamInviteError(
        "TEAM_INVITE_ALREADY_EXISTS",
        "Poziv ili članstvo za ovu email adresu već postoji.",
      );
    }
    throw error;
  }
}

export async function resendTeamInvite(input: {
  tenantId: string;
  actorTenantUserId: string;
  memberId: string;
}): Promise<TeamInviteResult> {
  if (!Types.ObjectId.isValid(input.memberId)) {
    throw new TeamInviteError("TEAM_INVITE_INVALID", "Poziv nije validan.", 400);
  }
  const token = createTeamInviteToken();
  return runTeamTransaction(async (session) => {
    const tenant = await lockTenant(input.tenantId, session);
    const member = await TenantUser.findOneAndUpdate(
      {
        _id: input.memberId,
        tenantId: tenant._id,
        role: "STAFF",
        status: "invited",
      },
      {
        $set: {
          invitationTokenHash: token.tokenHash,
          invitationExpiresAt: token.expiresAt,
          invitedAt: new Date(),
          invitedByTenantUserId: new Types.ObjectId(input.actorTenantUserId),
        },
      },
      { new: true, session },
    ).lean<{ _id: Types.ObjectId; email: string; name: string }>();
    if (!member) {
      throw new TeamInviteError(
        "TEAM_MEMBER_STATE_CONFLICT",
        "Samo postojeći STAFF poziv može biti ponovo poslat.",
      );
    }
    const inviter = await TenantUser.findOne({
      _id: input.actorTenantUserId,
      tenantId: tenant._id,
    })
      .select("name")
      .session(session)
      .lean<{ name?: string }>();
    return {
      memberId: String(member._id),
      email: member.email,
      name: member.name,
      role: "STAFF" as const,
      status: "invited" as const,
      rawToken: token.rawToken,
      expiresAt: token.expiresAt,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      inviterName: inviter?.name?.trim() || null,
    };
  });
}

export async function acceptTeamInvite(input: {
  rawToken: string;
  password: string;
}): Promise<{ memberId: string; tenantId: string; tenantSlug: string }> {
  if (!input.rawToken || input.password.length < 8) {
    throw new TeamInviteError(
      "TEAM_INVITE_INVALID",
      "Poziv nije validan ili lozinka ima manje od 8 karaktera.",
      400,
    );
  }
  await connectToDB();
  const tokenHash = hashTeamInviteToken(input.rawToken);
  const candidate = await TenantUser.findOne({ invitationTokenHash: tokenHash })
    .select("tenantId invitationExpiresAt status role")
    .lean<{
      tenantId: Types.ObjectId;
      invitationExpiresAt?: Date | null;
      status: string;
      role: TenantUserRole;
    }>();
  if (!candidate) {
    throw new TeamInviteError(
      "TEAM_INVITE_ALREADY_USED",
      "Poziv nije validan ili je već iskorišćen.",
      400,
    );
  }
  if (!candidate.invitationExpiresAt || candidate.invitationExpiresAt <= new Date()) {
    throw new TeamInviteError("TEAM_INVITE_EXPIRED", "Poziv je istekao.", 410);
  }
  if (candidate.status !== "invited" || candidate.role !== "STAFF") {
    throw new TeamInviteError(
      "TEAM_MEMBER_STATE_CONFLICT",
      "Poziv više nije aktivan.",
    );
  }

  const passwordHash = await hashPasswordAndSyncAuthUser(input.password, null);
  return runTeamTransaction(async (session) => {
    const tenant = await lockTenant(String(candidate.tenantId), session);
    const snapshot = await resolveTeamSeatSnapshot(String(candidate.tenantId), session);
    if (!snapshot.unlimited && snapshot.used > snapshot.limit) {
      throw new TeamInviteError(
        "TEAM_SEAT_LIMIT_REACHED",
        "Plan više nema dovoljno mesta za aktivaciju ovog poziva.",
      );
    }

    const member = await TenantUser.findOneAndUpdate(
      {
        tenantId: candidate.tenantId,
        role: "STAFF",
        status: "invited",
        invitationTokenHash: tokenHash,
        invitationExpiresAt: { $gt: new Date() },
      },
      {
        $set: {
          password: passwordHash,
          isEmailVerified: true,
          status: "active",
        },
        $unset: {
          invitationTokenHash: "",
          invitationExpiresAt: "",
        },
      },
      { new: true, session },
    ).lean<{ _id: Types.ObjectId }>();
    if (!member) {
      throw new TeamInviteError(
        "TEAM_INVITE_ALREADY_USED",
        "Poziv nije validan ili je već iskorišćen.",
        400,
      );
    }
    return {
      memberId: String(member._id),
      tenantId: String(candidate.tenantId),
      tenantSlug: tenant.slug,
    };
  });
}
