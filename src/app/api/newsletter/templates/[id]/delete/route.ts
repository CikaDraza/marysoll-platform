// app/api/newsletter/templates/[id]/delete/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { NewsletterTemplate } from "@/models/NewsletterTemplate";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const authResult: AdminAuthResult = await requireAdmin(request);
    if (!authResult.success) {
      return authResult.response;
    }

    await connectToDB();

    const deleted = await NewsletterTemplate.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Templejt nije pronađen" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Templejt obrisan" });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Greška" },
      { status: 500 },
    );
  }
}
