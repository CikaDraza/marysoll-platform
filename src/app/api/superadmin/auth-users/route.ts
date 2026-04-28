// GET /api/superadmin/auth-users
// Returns all OWNER / ADMIN / STAFF TenantUsers + orphaned AuthUsers (no linked TenantUser).
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { AuthUser } from "@/models/AuthUser";
import { Tenant } from "@/models/Tenant";
import { requireSuperAdmin } from "@/lib/auth/auth-server";

export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectToDB();

    const { searchParams } = req.nextUrl;
    const query = searchParams.get("query")?.trim() ?? "";
    const roleFilter = searchParams.get("role") ?? "all";

    const roles =
      roleFilter === "all" ? ["OWNER", "ADMIN", "STAFF"] : [roleFilter.toUpperCase()];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { role: { $in: roles } };
    if (query) {
      const rx = new RegExp(query, "i");
      filter.$or = [{ name: { $regex: rx } }, { email: { $regex: rx } }];
    }

    const tenantUsers = await TenantUser.find(filter, {
      _id: 1,
      tenantId: 1,
      authUserId: 1,
      name: 1,
      email: 1,
      phone: 1,
      role: 1,
      isOnline: 1,
      lastActive: 1,
      isEmailVerified: 1,
      createdAt: 1,
    })
      .sort({ createdAt: -1 })
      .lean();

    // Batch-fetch tenant names
    const tenantIds = [...new Set(tenantUsers.map((u) => String((u as Record<string, unknown>).tenantId)))];
    const tenants = await Tenant.find({ _id: { $in: tenantIds } })
      .select("_id name slug")
      .lean();

    const tenantMap = new Map(
      tenants.map((t) => {
        const doc = t as Record<string, unknown>;
        return [String(doc._id), { name: String(doc.name ?? ""), slug: String(doc.slug ?? "") }];
      }),
    );

    // Collect all authUserIds that are already represented in TenantUsers
    const linkedAuthUserIds = new Set(
      tenantUsers
        .map((u) => (u as Record<string, unknown>).authUserId)
        .filter(Boolean)
        .map(String),
    );

    const result = tenantUsers.map((u) => {
      const doc = u as Record<string, unknown>;
      const tid = String(doc.tenantId ?? "");
      return {
        _id: String(doc._id),
        tenantId: tid,
        tenantName: tenantMap.get(tid)?.name ?? "—",
        tenantSlug: tenantMap.get(tid)?.slug ?? "",
        name: String(doc.name ?? ""),
        email: String(doc.email ?? ""),
        phone: doc.phone ? String(doc.phone) : null,
        role: String(doc.role ?? ""),
        isOnline: Boolean(doc.isOnline),
        lastActive: doc.lastActive ?? null,
        isEmailVerified: Boolean(doc.isEmailVerified),
        createdAt: doc.createdAt ?? null,
        isOrphan: false,
      };
    });

    // Include orphaned AuthUsers (OWNER with no TenantUser) if role filter allows OWNER
    if (roles.includes("OWNER")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const authFilter: Record<string, any> = { platformRole: "OWNER" };
      if (query) {
        const rx = new RegExp(query, "i");
        authFilter.email = { $regex: rx };
      }

      const authUsers = await AuthUser.find(authFilter, {
        _id: 1,
        email: 1,
        isEmailVerified: 1,
        createdAt: 1,
      })
        .sort({ createdAt: -1 })
        .lean();

      for (const au of authUsers) {
        const doc = au as Record<string, unknown>;
        const id = String(doc._id);
        if (linkedAuthUserIds.has(id)) continue; // already in TenantUser list
        result.push({
          _id: id,
          tenantId: "",
          tenantName: "—",
          tenantSlug: "",
          name: "",
          email: String(doc.email ?? ""),
          phone: null,
          role: "OWNER",
          isOnline: false,
          lastActive: null,
          isEmailVerified: Boolean(doc.isEmailVerified),
          createdAt: doc.createdAt ?? null,
          isOrphan: true,
        });
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/superadmin/auth-users]", err);
    return NextResponse.json({ error: "Greška pri učitavanju korisnika" }, { status: 500 });
  }
}
