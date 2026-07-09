/**
 * POST /api/users/merge — admin: spoji duplikat nalog u keeper (Phase 4c).
 * Body: { sourceId (duplikat), targetId (keeper) }. Poziva mergeTenantUsers.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/auth-server";
import { mergeTenantUsers } from "@/lib/users/mergeTenantUsers";

const mergeSchema = z.object({
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { decoded } = auth;
  if (!decoded.isAdmin && !decoded.isSuperAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  if (!decoded.tenantId) {
    return NextResponse.json({ error: "No tenant context" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nevalidan JSON" }, { status: 400 });
  }
  const parsed = mergeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nevalidni podaci" }, { status: 400 });
  }

  try {
    const result = await mergeTenantUsers({
      tenantId: decoded.tenantId,
      sourceId: parsed.data.sourceId,
      targetId: parsed.data.targetId,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[users/merge] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Greška pri spajanju" },
      { status: 400 },
    );
  }
}
