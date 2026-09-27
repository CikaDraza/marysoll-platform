import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireOwner = vi.fn();
const createTeamInvite = vi.fn();
const sendTeamInvitationEmail = vi.fn();

vi.mock("@/lib/auth/auth-server", () => ({
  requireOwner: (...args: unknown[]) => requireOwner(...args),
}));
vi.mock("@/lib/team/invitations", () => ({
  createTeamInvite: (...args: unknown[]) => createTeamInvite(...args),
}));
vi.mock("@/lib/team/sendInvitation", () => ({
  sendTeamInvitationEmail: (...args: unknown[]) =>
    sendTeamInvitationEmail(...args),
}));
vi.mock("@/lib/platform/host-context", () => ({
  platformUrl: (path: string) => `https://example.test${path}`,
}));

import { POST } from "./route";

const ownerAuth = {
  success: true,
  decoded: { tenantId: "tenant-a" },
  membership: { id: "owner-a", tenantId: "tenant-a", role: "OWNER" },
};

function request(body: Record<string, unknown>) {
  return new NextRequest("https://example.test/api/team/invitations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/team/invitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireOwner.mockResolvedValue(ownerAuth);
    createTeamInvite.mockResolvedValue({
      memberId: "member-a",
      email: "staff@example.test",
      name: "Marija",
      role: "STAFF",
      status: "invited",
      rawToken: "raw-secret",
      expiresAt: new Date("2026-09-28T10:00:00.000Z"),
      tenantName: "Salon",
      tenantSlug: "salon",
      inviterName: "Vlasnica",
    });
    sendTeamInvitationEmail.mockResolvedValue(true);
  });

  it("OWNER kreira isključivo STAFF/invited poziv", async () => {
    const response = await POST(
      request({ name: "Marija", email: "staff@example.test" }),
    );
    expect(response.status).toBe(201);
    expect(createTeamInvite).toHaveBeenCalledWith({
      tenantId: "tenant-a",
      actorTenantUserId: "owner-a",
      name: "Marija",
      email: "staff@example.test",
    });
    await expect(response.json()).resolves.toMatchObject({
      member: { role: "STAFF", status: "invited" },
      inviteUrl: "https://example.test/team/invite?token=raw-secret",
      emailSent: true,
    });
  });

  it("odbija pokušaj role injection-a pre domain write-a", async () => {
    const response = await POST(
      request({ name: "Marija", email: "staff@example.test", role: "ADMIN" }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "TEAM_INVITE_ROLE_FORBIDDEN",
    });
    expect(createTeamInvite).not.toHaveBeenCalled();
  });

  it("browser ne može podmetnuti drugi tenant", async () => {
    await POST(
      request({
        name: "Marija",
        email: "staff@example.test",
        tenantId: "tenant-b",
      }),
    );
    expect(createTeamInvite).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-a" }),
    );
  });

  it.each(["ADMIN", "STAFF", "USER", "GUEST", "SUPER_ADMIN"])(
    "%s ne može pozvati člana",
    async () => {
      requireOwner.mockResolvedValue({
        success: false,
        response: NextResponse.json(
          { code: "OWNER_REQUIRED" },
          { status: 403 },
        ),
      });
      const response = await POST(
        request({ name: "Marija", email: "staff@example.test" }),
      );
      expect(response.status).toBe(403);
      expect(createTeamInvite).not.toHaveBeenCalled();
    },
  );
});
