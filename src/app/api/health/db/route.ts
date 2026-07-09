/**
 * GET /api/health/db — dijagnostika: koju bazu deployment REALNO koristi.
 * Ground truth iz mongoose konekcije (ne env nagađanje). Bez tajni (ni URI ni host).
 * Na produkciji vraća samo {isStaging:false} (ne otkriva prod dbName).
 * Svrha: potvrda da staging.* koristi marysoll_staging, ne prod bazu (merge QA bezbednost).
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";

export async function GET() {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";
  const isStaging = baseDomain.startsWith("staging.");

  // Na produkciji ne otkrivaj detalje (minimal recon površina).
  if (!isStaging) {
    return NextResponse.json({ ok: true, isStaging: false });
  }

  try {
    await connectToDB();
    const dbName = mongoose.connection?.db?.databaseName ?? null;
    const usingStagingUri = Boolean(process.env.MONGODB_STAGING_URI);
    return NextResponse.json({
      ok: true,
      isStaging: true,
      baseDomain,
      dbName, // očekivano: "marysoll_staging"
      usingStagingUri, // očekivano: true
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        isStaging: true,
        baseDomain,
        error: err instanceof Error ? err.message : "db error",
      },
      { status: 500 },
    );
  }
}
