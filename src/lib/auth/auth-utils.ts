/**
 * lib/auth/auth-utils.ts
 *
 * Alias za auth-client — za backward compatibility sa starim importima.
 * Novi kod treba da importuje direktno iz auth-client.ts.
 */
export {
  getUserFromToken,
  getRawToken,
  isTokenExpiringSoon,
} from "./auth-client";

export type { DecodedUser } from "@/types/auth/types";
