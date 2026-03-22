/**
 * lib/auth/index.ts
 *
 * Backward-compatible re-exports.
 *
 * SERVER routes treba da importuju direktno iz "@/lib/auth/auth-server"
 * CLIENT hooks treba da importuju direktno iz "@/lib/auth/auth-client"
 *
 * Ovaj barrel file zadržava postojeće importe koji rade,
 * ali server-only funkcije će biti tree-shaken na klijentu.
 */

// Client-safe exports (jwtDecode, localStorage)
export type { DecodedUser } from "@/types/auth/types";
export {
  getUserFromToken,
  getRawToken,
  isTokenExpiringSoon,
} from "./auth-client";
