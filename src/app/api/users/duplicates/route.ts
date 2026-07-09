/**
 * GET /api/users/duplicates — admin: mogući duplikati klijenata (Phase 4b).
 * Grupiše klijentske naloge (USER/GUEST) po NORMALIZOVANOM telefonu; vraća grupe
 * sa ≥2 naloga i bar jednim GOSTOM (email je unique po tenantu → ne može duplo).
 * Sažetak (poeni/posete/termini) po nalogu da vlasnik izabere "keeper".
 */
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAuth } from "@/lib/auth/auth-server";
import { TenantUser } from "@/models/TenantUser";
import { LoyaltyAccount } from "@/models/LoyaltyAccount";
import { Appointment } from "@/models/Appointment";
import { groupDuplicatesByPhone } from "@/lib/users/groupDuplicates";

interface UserRow {
  _id: Types.ObjectId;
  name?: string;
  email?: string;
  phone?: string;
  role: string;
  createdAt?: Date;
}

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const auth = requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { decoded } = auth;
    if (!decoded.isAdmin && !decoded.isSuperAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    if (!decoded.tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 403 });
    }
    const tenantId = new Types.ObjectId(decoded.tenantId);

    const users = (await TenantUser.find(
      { tenantId, role: { $in: ["USER", "GUEST"] } },
      { name: 1, email: 1, phone: 1, role: 1, createdAt: 1 },
    ).lean()) as unknown as UserRow[];

    // Grupiši po normalizovanom telefonu (pure heuristika).
    const dupGroups = groupDuplicatesByPhone(users);
    if (dupGroups.length === 0) return NextResponse.json({ groups: [] });

    // Batch sažetak (loyalty balans + broj termina) po nalogu.
    const allIds = dupGroups.flatMap((g) => g.accounts.map((u) => u._id));

    const accounts = (await LoyaltyAccount.find(
      { tenantId, tenantUserId: { $in: allIds } },
      { tenantUserId: 1, heartsBalance: 1, pointsBalance: 1, completedVisits: 1 },
    ).lean()) as unknown as Array<{
      tenantUserId: Types.ObjectId;
      heartsBalance?: number;
      pointsBalance?: number;
      completedVisits?: number;
    }>;
    const acctMap = new Map(
      accounts.map((a) => [a.tenantUserId.toString(), a]),
    );

    const apptCounts = (await Appointment.aggregate([
      { $match: { tenantId, clientProfileId: { $in: allIds } } },
      { $group: { _id: "$clientProfileId", count: { $sum: 1 } } },
    ])) as Array<{ _id: Types.ObjectId; count: number }>;
    const apptMap = new Map(apptCounts.map((a) => [String(a._id), a.count]));

    const groups = dupGroups.map((g) => ({
      key: g.key,
      accounts: g.accounts.map((u) => {
        const id = u._id.toString();
        const acct = acctMap.get(id);
        return {
          _id: id,
          name: u.name ?? "",
          email: u.email ?? "",
          phone: u.phone ?? "",
          role: u.role,
          isRegistered: u.role !== "GUEST",
          createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : null,
          hearts: acct?.heartsBalance ?? 0,
          points: acct?.pointsBalance ?? 0,
          visits: acct?.completedVisits ?? 0,
          appointments: apptMap.get(id) ?? 0,
        };
      }),
    }));

    return NextResponse.json({ groups });
  } catch (err) {
    console.error("[users/duplicates] failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
