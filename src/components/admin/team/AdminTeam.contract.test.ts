import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getPlanFeatures } from "@/lib/plans/planFeatures";

function source(file: string) {
  return readFileSync(path.join(process.cwd(), file), "utf8");
}

describe("STAFF-3 Team UI contract", () => {
  it("dashboard i sidebar izlažu owner-only Tim tab", () => {
    const dashboard = source("src/app/dashboard/page.tsx");
    const sidebar = source("src/layout/AppSidebar.tsx");
    expect(dashboard).toContain('| "tim"');
    expect(dashboard).toContain('effectiveTab === "tim"');
    expect(sidebar).toContain('name: "Tim"');
    expect(sidebar).toContain('ownerOnly: true');
    expect(sidebar).toContain('user?.globalRole !== "OWNER"');
  });

  it("UI prikazuje sve planove i ne hardkoduje Kiki kao jedini dozvoljen", () => {
    const team = source("src/components/admin/team/AdminTeam.tsx");
    for (const plan of ["maria", "claudia", "kiki", "enterprise"]) {
      expect(team).toContain(`${plan}:`);
    }
    expect(team).not.toMatch(/plan\s*===\s*["']kiki["']/);
    expect(team).toContain("seats.used");
    expect(team).toContain("seats.limit");
    expect(getPlanFeatures("kiki").staffMembers).toBe(10);
  });

  it("poziv i resend koriste isključivo STAFF-2 API hookove", () => {
    const hook = source("src/hooks/useTeam.ts");
    expect(hook).toContain('api.post<TeamInvitationResponse>("/team/invitations", input)');
    expect(hook).toContain("/team/invitations/${memberId}/resend");
    expect(hook).not.toContain("role:");
  });
});
