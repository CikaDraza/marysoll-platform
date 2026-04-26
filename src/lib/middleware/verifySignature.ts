// src/lib/middleware/verifySignature.ts
import crypto from "crypto";
import type { NextRequest } from "next/server";

const isDev = process.env.NODE_ENV !== "production";
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

type VerifyOk = { ok: true };
type VerifyFail = { ok: false; status: number; error: string };
export type VerifyResult = VerifyOk | VerifyFail;

/**
 * Verifies the HMAC-SHA256 signature on incoming server-to-server requests.
 *
 * @param req  The incoming NextRequest
 * @param body The raw request body string ("" for GET requests)
 */
export function verifySignature(req: NextRequest, body: string): VerifyResult {
  const apiKey = req.headers.get("x-api-key");
  const timestamp = req.headers.get("x-timestamp");
  const signature = req.headers.get("x-signature");

  if (!apiKey || !timestamp || !signature) {
    if (isDev) return { ok: true };
    return { ok: false, status: 401, error: "Nedostaju autentifikacioni zaglavlja" };
  }

  if (apiKey !== process.env.PLATFORM_API_KEY) {
    return { ok: false, status: 401, error: "Nevažeći API ključ" };
  }

  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() - ts) > MAX_CLOCK_SKEW_MS) {
    return { ok: false, status: 401, error: "Zahtev je istekao" };
  }

  const expected = crypto
    .createHmac("sha256", process.env.PLATFORM_API_SECRET!)
    .update(body + timestamp)
    .digest("hex");

  if (signature !== expected) {
    return { ok: false, status: 401, error: "Nevažeći potpis" };
  }

  return { ok: true };
}
