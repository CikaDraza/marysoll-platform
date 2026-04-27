// PUT /api/superadmin/categories/[id] — update category
// DELETE /api/superadmin/categories/[id] — delete category
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Category } from "@/models/Category";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { invalidateCategoryCache } from "@/lib/categoryService";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectToDB();
    const { id } = await params;
    const body = await req.json();

    const allowed = ["label", "synonyms", "subcategories", "isActive", "popularityScore"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = {};
    for (const field of allowed) {
      if (field in body) {
        if (field === "synonyms") {
          update[field] = (body[field] as string[]).map((s) => s.toLowerCase().trim()).filter(Boolean);
        } else if (field === "subcategories") {
          update[field] = (body[field] as { key: string; label: string; synonyms?: string[] }[]).map((s) => ({
            key: String(s.key).toLowerCase().trim(),
            label: String(s.label).trim(),
            synonyms: (s.synonyms ?? []).map((x) => x.toLowerCase().trim()).filter(Boolean),
          }));
        } else {
          update[field] = body[field];
        }
      }
    }

    const category = await Category.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!category) {
      return NextResponse.json({ error: "Kategorija nije pronađena" }, { status: 404 });
    }

    invalidateCategoryCache();
    return NextResponse.json(category);
  } catch (err) {
    console.error("[PUT /api/superadmin/categories/:id]", err);
    return NextResponse.json({ error: "Greška pri ažuriranju kategorije" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectToDB();
    const { id } = await params;

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return NextResponse.json({ error: "Kategorija nije pronađena" }, { status: 404 });
    }

    invalidateCategoryCache();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/superadmin/categories/:id]", err);
    return NextResponse.json({ error: "Greška pri brisanju kategorije" }, { status: 500 });
  }
}
