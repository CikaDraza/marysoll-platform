import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/auth-server";
import { platformUrl } from "@/lib/platform/host-context";
import { teamErrorResponse } from "@/lib/team/http";
import { resendTeamInvite } from "@/lib/team/invitations";
import { sendTeamInvitationEmail } from "@/lib/team/sendInvitation";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwner(req);
  if (!auth.success) return auth.response;
  if (!auth.membership) {
    return NextResponse.json(
      { error: "Vlasničko članstvo nije pronađeno.", code: "OWNER_REQUIRED" },
      { status: 403 },
    );
  }

  try {
    const { id } = await context.params;
    const invitation = await resendTeamInvite({
      tenantId: auth.membership.tenantId,
      actorTenantUserId: auth.membership.id,
      memberId: id,
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
    return NextResponse.json({
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
    });
  } catch (error) {
    return teamErrorResponse(error);
  }
}
