// app/api/newsletter/templates/route.ts
// GET /api/newsletter/templates
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { NewsletterTemplate } from "@/models/NewsletterTemplate";

export async function GET(request: Request) {
  const authResult: AdminAuthResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response;
  }

  await connectToDB();
  const templates = await NewsletterTemplate.find({})
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(templates);
}
