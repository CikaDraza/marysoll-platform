import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const acceptTeamInvite = vi.fn();
vi.mock("@/lib/team/invitations", () => ({
  acceptTeamInvite: (...args: unknown[]) => acceptTeamInvite(...args),
}));

import { POST } from "./route";

describe("POST /api/team/invitations/accept", () => {
  beforeEach(() => vi.clearAllMocks());

  it("prosleđuje samo token i novu lozinku domain lifecycle-u", async () => {
    acceptTeamInvite.mockResolvedValue({
      memberId: "member-a",
      tenantId: "tenant-a",
      tenantSlug: "salon",
    });
    const response = await POST(
      new NextRequest("https://example.test/api/team/invitations/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "secret", password: "Nova-lozinka-1" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(acceptTeamInvite).toHaveBeenCalledWith({
      rawToken: "secret",
      password: "Nova-lozinka-1",
    });
  });
});
