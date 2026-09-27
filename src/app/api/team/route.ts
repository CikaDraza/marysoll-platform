import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/auth-server";
import { getTeamOverview } from "@/lib/team/overview";

export async function GET(req: NextRequest) {
  const auth = await requireOwner(req);
  if (!auth.success) return auth.response;
  if (!auth.membership) {
    return NextResponse.json(
      { error: "Vlasničko članstvo nije pronađeno.", code: "OWNER_REQUIRED" },
      { status: 403 },
    );
  }

  try {
    return NextResponse.json(
      await getTeamOverview(auth.membership.tenantId),
    );
  } catch (error) {
    console.error("[team-overview] Failed to load team:", error);
    return NextResponse.json(
      { error: "Tim trenutno nije moguće učitati.", code: "TEAM_READ_FAILED" },
      { status: 500 },
    );
  }
}
