export interface DecodedToken {
  id: string;           // AuthUser._id for platform; TenantUser._id for tenant
  email: string;
  name: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  tenantUserId: string | null;  // TenantUser._id — null for superadmin
  tenantId: string | null;
  tenantSlug: string | null;
  globalRole?: string;
  /** Distinguishes platform tokens (SUPER_ADMIN) from tenant tokens (all tenant roles) */
  type: "platform" | "tenant";
  exp: number;
  iat: number;
}

export interface DecodedUser {
  id: string;
  /** @alias id — backward compat for components using user._id */
  _id?: string;
  email: string;
  name: string;
  phone: string;
  instagram?: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  tenantUserId: string | null;  // TenantUser._id
  tenantId: string | null;
  tenantSlug: string | null;
  globalRole?: string;
  isEmailVerified: boolean;
  isOnline?: boolean;
  lastActive?: string;
  exp: number;
}

export interface UserWithToken extends DecodedUser {
  token: string;
  /** @alias id — backward compat */
  _id: string;
}

/** Client-facing logged-in user shape (renamed from AuthUser to avoid collision with AuthUser Mongoose model) */
export interface LoggedInUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  token: string;
  tenantUserId?: string | null;
  tenantId?: string | null;
  isOnline?: boolean;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: Omit<LoggedInUser, "token">;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone: string;
  instagram?: string;
  agreedToPrivacy: boolean;
}
