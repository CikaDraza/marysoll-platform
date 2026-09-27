import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireOwner = vi.fn();
const resendTeamInvite = vi.fn();
const sendTeamInvitationEmail = vi.fn();

vi.mock("@/lib/auth/auth-server", () => ({
  requireOwner: (...args: unknown[]) => requireOwner(...args),
}));
vi.mock("@/lib/team/invitations", () => ({
  resendTeamInvite: (...args: unknown[]) => resendTeamInvite(...args),
}));
vi.mock("@/lib/team/sendInvitation", () => ({
  sendTeamInvitationEmail: (...args: unknown[]) =>
    sendTeamInvitationEmail(...args),
}));
vi.mock("@/lib/platform/host-context", () => ({
  platformUrl: (path: string) => `https://example.test${path}`,
}));

import { POST } from "./route";

const req = new NextRequest(
  "https://example.test/api/team/invitations/member-a/resend",
  { method: "POST" },
);

describe("POST /api/team/invitations/:id/resend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireOwner.mockResolvedValue({
      success: true,
      membership: { id: "owner-a", tenantId: "tenant-a", role: "OWNER" },
    });
    resendTeamInvite.mockResolvedValue({
      memberId: "member-a",
      email: "staff@example.test",
      name: "Marija",
      role: "STAFF",
      status: "invited",
      rawToken: "new-secret",
      expiresAt: new Date("2026-09-28T10:00:00.000Z"),
      tenantName: "Salon",
      tenantSlug: "salon",
      inviterName: "Vlasnica",
    });
    sendTeamInvitationEmail.mockResolvedValue(true);
  });

  it("OWNER rotira postojeći invite token", async () => {
    const response = await POST(req, {
      params: Promise.resolve({ id: "member-a" }),
    });
    expect(response.status).toBe(200);
    expect(resendTeamInvite).toHaveBeenCalledWith({
      tenantId: "tenant-a",
      actorTenantUserId: "owner-a",
      memberId: "member-a",
    });
    await expect(response.json()).resolves.toMatchObject({
      inviteUrl: "https://example.test/team/invite?token=new-secret",
    });
  });

  it("ne-owner se odbija pre rotacije", async () => {
    requireOwner.mockResolvedValue({
      success: false,
      response: NextResponse.json({ code: "OWNER_REQUIRED" }, { status: 403 }),
    });
    const response = await POST(req, {
      params: Promise.resolve({ id: "member-a" }),
    });
    expect(response.status).toBe(403);
    expect(resendTeamInvite).not.toHaveBeenCalled();
  });
});
