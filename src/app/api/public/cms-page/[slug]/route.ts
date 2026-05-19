// GET /api/public/cms-page/[slug] — publicly accessible, no auth required
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { ProfilPlatforme } from "@/models/ProfilPlatforme";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  try {
    await connectToDB();
    const profile = await ProfilPlatforme.findOne({}).select("cmsPages").lean() as
      | { cmsPages?: Record<string, unknown> }
      | null;

    if (!profile?.cmsPages) {
      return NextResponse.json({ error: "Stranica nije pronađena" }, { status: 404 });
    }

    const page = profile.cmsPages[slug];
    if (!page) {
      return NextResponse.json({ error: "Stranica nije pronađena" }, { status: 404 });
    }

    return NextResponse.json(page);
  } catch (err) {
    console.error("[GET /api/public/cms-page]", err);
    return NextResponse.json({ error: "Greška" }, { status: 500 });
  }
}
