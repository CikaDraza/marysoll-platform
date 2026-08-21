// GET /api/audience-contacts — list all contacts for the authenticated tenant
import { NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { connectToDB } from "@/lib/db/mongodb";
import { AudienceContact } from "@/models/AudienceContact";
import { requireCapability } from "@/lib/platform/capabilities-server";

export async function GET(req: Request) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const denied = await requireCapability(
      authResult.decoded.tenantId,
      "audience.contacts",
    );
    if (denied) return denied;

    const tenantId = authResult.decoded.tenantId;

    await connectToDB();

    const contacts = await AudienceContact.find({ tenantId })
      .select("_id email firstName lastName status subscribed contactType")
      .sort({ email: 1 })
      .lean();

    return NextResponse.json({ contacts });
  } catch (error: unknown) {
    console.error("[GET /api/audience-contacts]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
