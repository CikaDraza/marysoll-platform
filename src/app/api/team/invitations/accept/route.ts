import { NextRequest, NextResponse } from "next/server";
import { teamErrorResponse } from "@/lib/team/http";
import { acceptTeamInvite } from "@/lib/team/invitations";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      token?: unknown;
      password?: unknown;
    };
    const accepted = await acceptTeamInvite({
      rawToken: typeof body.token === "string" ? body.token : "",
      password: typeof body.password === "string" ? body.password : "",
    });
    return NextResponse.json({ success: true, ...accepted });
  } catch (error) {
    return teamErrorResponse(error);
  }
}
