export type TeamInviteErrorCode =
  | "TEAM_INVITE_INVALID"
  | "TEAM_INVITE_EXPIRED"
  | "TEAM_INVITE_ALREADY_USED"
  | "TEAM_INVITE_ROLE_FORBIDDEN"
  | "TEAM_EMAIL_ALREADY_CLIENT"
  | "TEAM_MEMBER_ALREADY_ACTIVE"
  | "TEAM_INVITE_ALREADY_EXISTS"
  | "TEAM_MEMBER_SUSPENDED"
  | "TEAM_MEMBER_STATE_CONFLICT"
  | "TEAM_SEAT_LIMIT_REACHED"
  | "TEAM_TENANT_NOT_FOUND"
  | "TEAM_CONFLICT";

export class TeamInviteError extends Error {
  constructor(
    readonly code: TeamInviteErrorCode,
    message: string,
    readonly status: number = 409,
  ) {
    super(message);
    this.name = "TeamInviteError";
  }
}

export function isMongoDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}
