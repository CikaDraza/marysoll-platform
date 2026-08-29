import "server-only";

import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { requireTenantAdmin } from "@/lib/auth/auth-server";
import { requireCapability } from "@/lib/platform/capabilities-server";

export type EducationContentAuthority =
  | { ok: true; tenantId: string }
  | { ok: false; response: NextResponse };

/**
 * Jedini ulaz u Education content rute: admin permission → tenant iz auth
 * konteksta → capability gate. `tenantId` nikada ne dolazi iz tela zahteva.
 */
export async function requireEducationContentAuthority(
  request: Request,
): Promise<EducationContentAuthority> {
  const auth = requireTenantAdmin(request);
  if (!auth.success) return { ok: false, response: auth.response };

  const denied = await requireCapability(auth.tenantId, "education.catalog");
  if (denied) return { ok: false, response: denied };

  return { ok: true, tenantId: auth.tenantId };
}

export function invalidIdResponse() {
  return NextResponse.json(
    { error: "Neispravan identifikator sadržaja", code: "INVALID_ID" },
    { status: 400 },
  );
}

export function notFoundResponse() {
  return NextResponse.json(
    { error: "Sadržaj nije pronađen", code: "EDUCATION_CONTENT_NOT_FOUND" },
    { status: 404 },
  );
}

export function slugTakenResponse() {
  return NextResponse.json(
    {
      error: "Web adresa je već zauzeta za drugi sadržaj",
      code: "EDUCATION_SLUG_TAKEN",
    },
    { status: 409 },
  );
}

export function metadataFailureResponse(message: string) {
  return NextResponse.json(
    { error: message, code: "EDUCATION_CONTENT_INVALID" },
    { status: 400 },
  );
}

export function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

/** Mongo duplicate-key na tenant+slug indeksu. */
export function isDuplicateSlugError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}
