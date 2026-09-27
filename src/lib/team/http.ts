import { NextResponse } from "next/server";
import { TeamInviteError } from "./errors";

export function teamErrorResponse(error: unknown): NextResponse {
  if (error instanceof TeamInviteError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  console.error("[team-invite] Unexpected error:", error);
  return NextResponse.json(
    { error: "Greška na serveru", code: "TEAM_INTERNAL_ERROR" },
    { status: 500 },
  );
}
