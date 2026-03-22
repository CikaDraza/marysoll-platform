// app/api/newsletter/templates/[id]/update/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { type AdminAuthResult, requireAdmin } from "@/lib/auth/auth-server";
import { NewsletterTemplate } from "@/models/NewsletterTemplate";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(request);
    if (!authResult.success) {
      return authResult.response;
    }

    await connectToDB();
    const { id } = await context.params;
    const body = await request.json();
    const updated = await NewsletterTemplate.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Templejt nije pronađen" },
        { status: 404 },
      );
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Greška prilikom ažuriranja",
      },
      { status: 500 },
    );
  }
}
