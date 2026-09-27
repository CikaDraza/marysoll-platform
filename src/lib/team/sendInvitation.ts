import "server-only";

import { sendEmail } from "@/lib/email/email";
import { teamInviteTemplate } from "@/lib/email/templates/teamInviteTemplate";
import type { TeamInviteResult } from "./invitations";

export async function sendTeamInvitationEmail(
  invitation: TeamInviteResult,
  inviteUrl: string,
  tenantId: string,
): Promise<boolean> {
  try {
    const html = await teamInviteTemplate({
      tenantId,
      salonName: invitation.tenantName,
      recipientName: invitation.name,
      inviterName: invitation.inviterName,
      inviteUrl,
      expiresAt: invitation.expiresAt,
    });
    await sendEmail({
      to: invitation.email,
      subject: `Poziv u tim salona ${invitation.tenantName}`,
      html,
      tenantId,
    });
    return true;
  } catch (error) {
    console.error("[team-invite] Email delivery failed:", error);
    return false;
  }
}
