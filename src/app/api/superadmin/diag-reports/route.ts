import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { DiagReport } from "@/models/DiagReport";

/**
 * GET /api/superadmin/diag-reports — poslednjih 20 dijagnostičkih reportova.
 * Auth: proxy guarduje ceo /api/superadmin prefiks (samo superadmin).
 * Pregled: otvoriti u browseru dok si ulogovan na superadmin.marysoll.com.
 */
export async function GET() {
  try {
    await connectToDB();
    const reports = await DiagReport.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    return NextResponse.json({ reports });
  } catch (err) {
    console.error("[DIAG] čitanje reportova nije uspelo:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
