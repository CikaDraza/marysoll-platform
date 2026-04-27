// GET /api/superadmin/categories — list all categories (including inactive)
// POST /api/superadmin/categories — create new category
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Category } from "@/models/Category";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { invalidateCategoryCache } from "@/lib/categoryService";

export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectToDB();
    const categories = await Category.find({})
      .sort({ popularityScore: -1, label: 1 })
      .lean();
    return NextResponse.json(categories);
  } catch (err) {
    console.error("[GET /api/superadmin/categories]", err);
    return NextResponse.json({ error: "Greška pri učitavanju kategorija" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectToDB();
    const body = await req.json();

    const { key, label, synonyms = [], subcategories = [], isActive = true } = body;

    if (!key || !label) {
      return NextResponse.json({ error: "key i label su obavezni" }, { status: 400 });
    }

    const normalizedKey = String(key).toLowerCase().trim().replace(/\s+/g, "-");

    const existing = await Category.findOne({ key: normalizedKey });
    if (existing) {
      return NextResponse.json({ error: "Kategorija sa ovim ključem već postoji" }, { status: 409 });
    }

    const category = await Category.create({
      key: normalizedKey,
      label: String(label).trim(),
      synonyms: (synonyms as string[]).map((s) => s.toLowerCase().trim()).filter(Boolean),
      subcategories: (subcategories as { key: string; label: string; synonyms?: string[] }[]).map((s) => ({
        key: String(s.key).toLowerCase().trim(),
        label: String(s.label).trim(),
        synonyms: (s.synonyms ?? []).map((x) => x.toLowerCase().trim()).filter(Boolean),
      })),
      isActive,
    });

    invalidateCategoryCache();
    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    console.error("[POST /api/superadmin/categories]", err);
    return NextResponse.json({ error: "Greška pri kreiranju kategorije" }, { status: 500 });
  }
}
