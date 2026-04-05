export interface DecodedToken {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  tenantId: string | null;
  tenantSlug: string | null;
  globalRole?: string;
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
  isAdmin: boolean;
  isSuperAdmin: boolean;
  tenantId: string | null;
  tenantSlug: string | null;
  globalRole?: string;
  userType: "guest" | "legal";
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

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  token: string;
  isOnline?: boolean;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: Omit<AuthUser, "token">;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone: string;
  agreedToPrivacy: boolean;
}
