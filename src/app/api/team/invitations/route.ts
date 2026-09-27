import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/auth-server";
import { platformUrl } from "@/lib/platform/host-context";
import { TeamInviteError } from "@/lib/team/errors";
import { teamErrorResponse } from "@/lib/team/http";
import { createTeamInvite } from "@/lib/team/invitations";
import { sendTeamInvitationEmail } from "@/lib/team/sendInvitation";

export async function POST(req: NextRequest) {
  const auth = await requireOwner(req);
  if (!auth.success) return auth.response;
  if (!auth.membership) {
    return NextResponse.json(
      { error: "Vlasničko članstvo nije pronađeno.", code: "OWNER_REQUIRED" },
      { status: 403 },
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(body, "role")) {
      throw new TeamInviteError(
        "TEAM_INVITE_ROLE_FORBIDDEN",
        "Novi poziv u STAFF v1 uvek kreira STAFF članstvo.",
        400,
      );
    }
    const invitation = await createTeamInvite({
      tenantId: auth.membership.tenantId,
      actorTenantUserId: auth.membership.id,
      name: typeof body.name === "string" ? body.name : "",
      email: typeof body.email === "string" ? body.email : "",
    });
    const inviteUrl = platformUrl(
      `/team/invite?token=${encodeURIComponent(invitation.rawToken)}`,
      req,
    );
    const emailSent = await sendTeamInvitationEmail(
      invitation,
      inviteUrl,
      auth.membership.tenantId,
    );

    return NextResponse.json(
      {
        member: {
          id: invitation.memberId,
          email: invitation.email,
          name: invitation.name,
          role: invitation.role,
          status: invitation.status,
        },
        inviteUrl,
        expiresAt: invitation.expiresAt,
        emailSent,
      },
      { status: 201 },
    );
  } catch (error) {
    return teamErrorResponse(error);
  }
}
