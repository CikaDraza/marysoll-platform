/**
 * GET /api/public/[tenantSlug]/appointments/check-client?email=&phone=
 *
 * Public — bez auth-a. Guest booking forma zove na blur telefona/emaila da
 * signalizira klijentu ako već ima nalog (prevencija duplikata, Phase 4a).
 * Vraća SAMO boolean-e (exists / isRegistered) — ne otkriva čiji je nalog.
 */
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { findExistingClient } from "@/lib/users/findExistingClient";
import { requireCapability } from "@/lib/platform/capabilities-server";

type Params = { params: Promise<{ tenantSlug: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { tenantSlug } = await params;
    const email = req.nextUrl.searchParams.get("email") ?? "";
    const phone = req.nextUrl.searchParams.get("phone") ?? "";
    if (!email.trim() && !phone.trim()) {
      return NextResponse.json({ exists: false, isRegistered: false });
    }

    await connectToDB();
    const tenant = await Tenant.findOne({ slug: tenantSlug, status: "active" })
      .select("_id")
      .lean<{ _id: Types.ObjectId } | null>();
    if (!tenant) {
      return NextResponse.json({ exists: false, isRegistered: false });
    }
    const denied = await requireCapability(String(tenant._id), "booking.services");
    if (denied) return NextResponse.json({ exists: false, isRegistered: false });

    const match = await findExistingClient({
      tenantId: tenant._id,
      email,
      phone,
    });
    return NextResponse.json({
      exists: Boolean(match),
      isRegistered: Boolean(match?.isRegistered),
    });
  } catch (err) {
    console.error("[check-client] failed:", err);
    // Nikad ne blokiraj booking zbog check-a.
    return NextResponse.json({ exists: false, isRegistered: false });
  }
}
