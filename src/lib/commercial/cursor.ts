import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { commercialCursorPayloadSchema } from "@/types/commercial";
import type { CommercialAccess, CommercialCursorCodec } from "@/types/commercial";
import { principalIdentity } from "@/helpers/commercial/accessEvidence";

export function commercialPrincipalKey(access: CommercialAccess): string {
  return createHash("sha256").update(principalIdentity(access.principal)).digest("hex");
}

/** Inject a server key; no env setup, DMD wire encoding or default development key. */
export function createCommercialCursorCodec(signingKey: Uint8Array): CommercialCursorCodec {
  if (signingKey.byteLength < 32) throw new Error("Commercial cursor signing key must contain at least 32 bytes");
  const key = Buffer.from(signingKey);
  const sign = (body: string) => createHmac("sha256", key).update(body).digest();
  return {
    encode(payload) {
      const body = Buffer.from(JSON.stringify(commercialCursorPayloadSchema.parse(payload))).toString("base64url");
      return `${body}.${sign(body).toString("base64url")}`;
    },
    decode(cursor) {
      if (cursor.length > 4096) return null;
      const parts = cursor.split(".");
      if (parts.length !== 2 || !parts.every((part) => /^[\w-]+$/.test(part))) return null;
      const [body, signature] = parts;
      const provided = Buffer.from(signature, "base64url");
      const expected = sign(body);
      if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
      try {
        const parsed = commercialCursorPayloadSchema.safeParse(JSON.parse(Buffer.from(body, "base64url").toString("utf8")));
        return parsed.success ? parsed.data : null;
      } catch { return null; }
    },
  };
}
