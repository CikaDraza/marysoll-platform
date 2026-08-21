// app/api/services/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Service } from "@/models/Service";
import { requireAdmin } from "@/lib/auth/auth-server";
import { requireCapability } from "@/lib/platform/capabilities-server";

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const auth = requireAdmin(req);
    if (!auth.success) return auth.response;
    const denied = await requireCapability(auth.decoded.tenantId, "services.catalog");
    if (denied) return denied;
    const tenantId = auth.decoded.tenantId;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim();

    const baseFilter: Record<string, unknown> = tenantId ? { tenantId } : {};
    let filter = baseFilter;

    if (query) {
      const words = query.split(/\s+/).filter((w) => w.length > 1);
      const regexWords = words.map((word) => ({
        $or: [
          { name: { $regex: word, $options: "i" } },
          { category: { $regex: word, $options: "i" } },
          { subcategory: { $regex: word, $options: "i" } },
          { description: { $regex: word, $options: "i" } },
        ],
      }));
      filter = { ...baseFilter, $and: regexWords };
    }

    const services = await Service.find(filter).sort({ category: 1, name: 1 });
    return NextResponse.json(services);
  } catch (err) {
    console.error("GET /api/services:", err);
    return NextResponse.json(
      { error: "Greška pri učitavanju." },
      { status: 500 },
    );
  }
}
