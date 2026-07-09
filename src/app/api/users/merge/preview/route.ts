/**
 * POST /api/users/merge/preview — admin: šta bi merge pomerio + before/after zbir.
 * Read-only (ne mutira). Modal prikazuje ove brojeve; ne računa na frontu.
 * Body: { sourceId, targetId }.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/auth-server";
import { buildMergePreview } from "@/lib/users/mergePreview";

const schema = z.object({
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nevalidni podaci" }, { status: 400 });
  }

  try {
    const preview = await buildMergePreview({
      tenantId: decoded.tenantId,
      sourceId: parsed.data.sourceId,
      targetId: parsed.data.targetId,
    });
    return NextResponse.json(preview);
  } catch (err) {
    console.error("[users/merge/preview] failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
