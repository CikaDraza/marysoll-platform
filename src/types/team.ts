import type { PlanName } from "@/lib/plans/planFeatures";

export type TeamMemberRole = "OWNER" | "ADMIN" | "STAFF";
export type TeamMemberStatus = "active" | "invited" | "suspended";

export interface TeamMemberView {
  id: string;
  name: string;
  email: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  isEmailVerified: boolean;
  invitedAt: string | null;
  createdAt: string;
}

export interface TeamOverview {
  plan: PlanName;
  seats: {
    used: number;
    limit: number;
    remaining: number | null;
    unlimited: boolean;
    canAdd: boolean;
  };
  members: TeamMemberView[];
}

export interface TeamInvitationResponse {
  member: {
    id: string;
    email: string;
    name: string;
    role: "STAFF";
    status: "invited";
  };
  inviteUrl: string;
  expiresAt: string;
  emailSent: boolean;
}
