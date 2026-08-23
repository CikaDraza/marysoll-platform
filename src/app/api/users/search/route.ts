import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { Types } from "mongoose";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";
import {
  buildClientSearchFilter,
  CLIENT_SEARCH_FIELDS,
} from "@/lib/search/clientSearch";

export async function GET(req: Request) {
  try {
    await connectToDB();

    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });

    if (!decoded.isAdmin && !decoded.isSuperAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    if (!decoded.tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim() ?? "";
    const date = searchParams.get("date")?.trim() ?? "";

    // ── Paginacija je OPT-IN ───────────────────────────────────────────────
    // Bez `page` parametra ruta vraća go niz svih klijenata — tako je koriste
    // AdminCreateModal (izbor klijenta) i isOnline lookup u listama termina,
    // kojima treba PUNA lista. Lista klijenata šalje `page` i dobija
    // { users, pagination }. Menjanje podrazumevanog oblika bi tiho pokvarilo
    // te potrošače (našli bi samo klijente sa prve strane).
    const pageParam = searchParams.get("page");
    const paginated = pageParam !== null;
    const page = Math.max(1, parseInt(pageParam || "1") || 1);
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10") || 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {
      tenantId: new Types.ObjectId(decoded.tenantId),
      role: { $nin: ["OWNER", "ADMIN"] },
    };

    // Reč-po-reč pretraga po imenu/prezimenu, mejlu, Instagramu, TikToku i
    // telefonu — sa ili bez @ ispred handle-a.
    const search = buildClientSearchFilter(query, CLIENT_SEARCH_FIELDS);
    if (search) {
      filter.$and = search.$and;
    }

    if (date) {
      const start = new Date(date + "T00:00:00.000Z");
      const end = new Date(date + "T23:59:59.999Z");
      filter.createdAt = { $gte: start, $lte: end };
    }

    const projection = {
      _id: 1,
      name: 1,
      email: 1,
      phone: 1,
      instagram: 1,
      tiktok: 1,
      birthday: 1,
      role: 1,
      isOnline: 1,
      isEmailVerified: 1,
      lastActive: 1,
      createdAt: 1,
    };

    if (!paginated) {
      const users = await TenantUser.find(filter, projection)
        .sort({ createdAt: -1 })
        .lean();
      return NextResponse.json(users);
    }

    const totalCount = await TenantUser.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);
    // Ako pretraga suzi listu ispod trenutne strane, vrati se na poslednju
    // postojeću — inače korisnik gleda praznu stranu bez objašnjenja.
    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;

    const users = await TenantUser.find(filter, projection)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      users,
      pagination: {
        page: safePage,
        limit,
        totalCount,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPrevPage: safePage > 1,
      },
    });
  } catch (error) {
    console.error("User search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
