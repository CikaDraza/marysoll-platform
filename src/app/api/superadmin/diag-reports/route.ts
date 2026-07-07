import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { DiagReport } from "@/models/DiagReport";
import {
  DIAG_NULL_LABEL,
  diagModuleResultSchema,
  diagQuerySchema,
} from "@/types/diagnostics";
import type {
  DiagLabelSummary,
  DiagModuleResult,
  DiagReportDTO,
} from "@/types/diagnostics";

/**
 * GET /api/superadmin/diag-reports — čitanje samouslužne dijagnostike.
 * Auth: proxy guarduje ceo /api/superadmin prefiks (samo superadmin).
 *
 * Bez parametra → sažetak po oznaci (label): { labels: [{label,count,lastAt}] }
 *   za select "Izaberi salon" u Dijagnostika tabu (pošto reporti još nemaju
 *   tenantId, grupišemo po ?u= oznaci; label=null = "(bez oznake)").
 * ?label=<oznaka> (ili __NULL__ za bez-oznake) → { reports: [...] } poslednjih 50.
 *
 * Filtriranje, agregacija i formatiranje su na serveru (pravilo 4.2);
 * query param i izlazni moduli se validiraju Zod-om (pravilo 2.2).
 */

/** Nevaljan modul (stari/pokvaren Mixed zapis) se preskače, ne obara ceo report. */
function parseModules(raw: unknown): DiagModuleResult[] | null {
  if (!Array.isArray(raw)) return null;
  const out: DiagModuleResult[] = [];
  for (const item of raw) {
    const parsed = diagModuleResultSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

export async function GET(req: NextRequest) {
  try {
    await connectToDB();

    const query = diagQuerySchema.parse({
      label: req.nextUrl.searchParams.get("label"),
    });

    // Reportovi za izabranu oznaku
    if (query.label !== null) {
      const filter =
        query.label === DIAG_NULL_LABEL
          ? { label: null }
          : { label: query.label };
      const docs = await DiagReport.find(filter)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const reports: DiagReportDTO[] = docs.map((d) => {
        const doc = d as Record<string, unknown>;
        return {
          _id: String(doc._id),
          label: (doc.label as string | null) ?? null,
          userAgent: (doc.userAgent as string | null) ?? null,
          ip: (doc.ip as string | null) ?? null,
          country: (doc.country as string | null) ?? null,
          pageHost: (doc.pageHost as string | null) ?? null,
          results: parseModules(doc.results),
          createdAt: new Date(doc.createdAt as string).toISOString(),
        };
      });
      return NextResponse.json({ reports });
    }

    // Sažetak po oznaci za select
    const grouped = (await DiagReport.aggregate([
      {
        $group: {
          _id: "$label",
          count: { $sum: 1 },
          lastAt: { $max: "$createdAt" },
        },
      },
      { $sort: { lastAt: -1 } },
    ])) as { _id: string | null; count: number; lastAt: Date }[];

    const labels: DiagLabelSummary[] = grouped.map((g) => ({
      label: g._id ?? null,
      count: g.count,
      lastAt: new Date(g.lastAt).toISOString(),
    }));

    return NextResponse.json({ labels });
  } catch (err) {
    console.error("[DIAG] čitanje reportova nije uspelo:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
