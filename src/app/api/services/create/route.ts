import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Service } from "@/models/Service";
import { requireAdmin } from "@/lib/auth/auth-server";
import { DecodedToken } from "@/types/auth/types";

export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const auth = (await requireAdmin(req)) as
      | { decoded: DecodedToken }
      | NextResponse;
    if (auth instanceof NextResponse) return auth;
    const tenantId = auth.decoded.tenantId;

    const body = await req.json();
    if (!body.name || !body.category || !body.type) {
      return NextResponse.json(
        { error: "Naziv, kategorija i tip su obavezni." },
        { status: 400 },
      );
    }

    const service = await Service.create({
      ...body,
      tenantId: tenantId ?? undefined,
    });
    return NextResponse.json(service, { status: 201 });
  } catch (err) {
    console.error("POST /api/services/create:", err);
    return NextResponse.json(
      { error: "Greška pri kreiranju." },
      { status: 500 },
    );
  }
}
