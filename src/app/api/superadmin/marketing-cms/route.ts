// GET /api/superadmin/marketing-cms — fetch marketing landing structure
// PUT /api/superadmin/marketing-cms — save marketing landing structure
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { ProfilPlatforme } from "@/models/ProfilPlatforme";

export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectToDB();
    const profile = await ProfilPlatforme.findOne({}).select("marketingLanding").lean() as
      | { marketingLanding?: Record<string, unknown> }
      | null;

    return NextResponse.json({ marketingLanding: profile?.marketingLanding ?? {} });
  } catch (err) {
    console.error("[GET /api/superadmin/marketing-cms]", err);
    return NextResponse.json({ error: "Greška pri učitavanju" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectToDB();
    const body = await req.json() as { marketingLanding?: unknown };

    await ProfilPlatforme.findOneAndUpdate(
      {},
      { $set: { marketingLanding: body.marketingLanding } },
      { upsert: true },
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PUT /api/superadmin/marketing-cms]", err);
    return NextResponse.json({ error: "Greška pri čuvanju" }, { status: 500 });
  }
}
