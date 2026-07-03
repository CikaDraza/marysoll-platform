import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { DiagReport } from "@/models/DiagReport";

/**
 * POST /api/public/diag-report — snima rezultat dijagnostike sa /dijagnostika
 * stranice. Javan namerno: korisnik kome ne radi login mora moći da pošalje
 * report. Zaštita od zloupotrebe: tvrdi cap na veličinu i whitelist polja.
 */
export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (raw.length > 20_000) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    let body: {
      label?: unknown;
      pageHost?: unknown;
      results?: unknown;
    };
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    await connectToDB();

    const forwarded = req.headers.get("x-forwarded-for");
    const report = await DiagReport.create({
      label:
        typeof body.label === "string" ? body.label.slice(0, 100) : null,
      pageHost:
        typeof body.pageHost === "string" ? body.pageHost.slice(0, 200) : null,
      results: body.results ?? null,
      userAgent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
      ip: forwarded ? forwarded.split(",")[0].trim() : null,
      country: req.headers.get("x-vercel-ip-country") ?? null,
    });

    return NextResponse.json({ ok: true, id: report._id });
  } catch (err) {
    console.error("[DIAG] snimanje reporta nije uspelo:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
