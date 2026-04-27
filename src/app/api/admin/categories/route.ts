// GET /api/admin/categories — returns active categories for service form dropdown
import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";
import { getCategories } from "@/lib/categoryService";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const decoded = verifyToken(token);
  if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  if (!decoded.isAdmin && !decoded.isSuperAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  try {
    const categories = await getCategories();
    return NextResponse.json(categories);
  } catch (err) {
    console.error("[GET /api/admin/categories]", err);
    return NextResponse.json({ error: "Greška pri učitavanju kategorija" }, { status: 500 });
  }
}
