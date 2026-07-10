/**
 * GET   /api/superadmin/tenants/[tenantId]/client-gender
 * PATCH /api/superadmin/tenants/[tenantId]/client-gender
 *
 * SuperAdmin: rod klijentele salona za obraćanje u UI/obaveštenjima.
 * "neutral" = trenutno (dual/muški), "female" = ženski rod.
 *
 * PATCH body: { clientGender: "neutral" | "female" }
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { SalonProfile } from "@/models/SalonProfile";
import type { ClientGender } from "@/types";

type Params = { params: Promise<{ tenantId: string }> };

type GenderDoc = {
  tenantId: unknown;
  name?: string;
  clientGender?: ClientGender;
};

function serialize(doc: GenderDoc) {
  return {
    tenantId: String(doc.tenantId),
    name: doc.name ?? "",
    clientGender: doc.clientGender === "female" ? "female" : "neutral",
  };
}

export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await params;
  try {
    await connectToDB();
    const profile = await SalonProfile.findOne({ tenantId })
      .select("tenantId name clientGender")
      .lean<GenderDoc>();

    if (!profile) {
      return NextResponse.json(
        { error: "Profil salona nije pronađen" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: serialize(profile) });
  } catch (err) {
    console.error("GET /api/superadmin/tenants/[tenantId]/client-gender:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    clientGender?: unknown;
  };

  if (body.clientGender !== "neutral" && body.clientGender !== "female") {
    return NextResponse.json(
      { error: "clientGender mora biti 'neutral' ili 'female'." },
      { status: 400 },
    );
  }

  try {
    await connectToDB();
    const profile = await SalonProfile.findOneAndUpdate(
      { tenantId },
      { $set: { clientGender: body.clientGender } },
      { new: true },
    )
      .select("tenantId name clientGender")
      .lean<GenderDoc>();

    if (!profile) {
      return NextResponse.json(
        { error: "Profil salona nije pronađen" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Rod klijentele je sačuvan.",
      data: serialize(profile),
    });
  } catch (err) {
    console.error(
      "PATCH /api/superadmin/tenants/[tenantId]/client-gender:",
      err,
    );
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
