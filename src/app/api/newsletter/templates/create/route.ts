// POST /api/newsletter/templates/create
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { NewsletterTemplate } from "@/models/NewsletterTemplate";

export async function POST(request: Request) {
  // OBAVEZNO za kreiranje – samo admin sme
  const authResult: AdminAuthResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response;
  }

  await connectToDB();

  try {
    const body = await request.json();
    const {
      name,
      slug,
      subject,
      htmlTemplate,
      variables,
      thumbnail,
      isActive,
      hasVariables,
    } = body;

    // Validacija...
    if (!name || !slug || !subject || !htmlTemplate) {
      return NextResponse.json(
        { error: "Nedostaju obavezna polja" },
        { status: 400 },
      );
    }

    const existing = await NewsletterTemplate.findOne({ slug });
    if (existing) {
      return NextResponse.json(
        { error: `Slug "${slug}" već postoji` },
        { status: 400 },
      );
    }

    const template = new NewsletterTemplate({
      name,
      slug,
      subject,
      htmlTemplate,
      variables,
      thumbnail,
      isActive: isActive ?? true,
      hasVariables,
    });

    await template.save();

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("POST template error:", error);
    return NextResponse.json(
      { error: "Greška prilikom kreiranja templejta" },
      { status: 500 },
    );
  }
}
