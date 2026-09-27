import type { TenantUserStatus } from "@/models/TenantUser";

export interface TenantMembershipSessionState {
  status: TenantUserStatus | string;
  isEmailVerified: boolean;
}

export interface TenantMembershipSessionDenial {
  error: string;
  code: "MEMBERSHIP_INACTIVE" | "EMAIL_NOT_VERIFIED";
  httpStatus: 401 | 403;
}

/** Every tenant login and refresh entry point must use this fail-closed gate. */
export function tenantMembershipSessionDenial(
  member: TenantMembershipSessionState,
): TenantMembershipSessionDenial | null {
  if (member.status !== "active") {
    return {
      error:
        member.status === "suspended"
          ? "Vaš nalog je suspendovan. Kontaktirajte salon."
          : "Nalog još nije aktiviran putem poziva.",
      code: "MEMBERSHIP_INACTIVE",
      httpStatus: 403,
    };
  }
  if (!member.isEmailVerified) {
    return {
      error: "Email adresa nije verifikovana.",
      code: "EMAIL_NOT_VERIFIED",
      httpStatus: 401,
    };
  }
  return null;
}
