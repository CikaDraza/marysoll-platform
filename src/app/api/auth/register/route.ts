/**
 * POST /api/auth/register
 *
 * This endpoint has been removed.
 * All tenant client registrations must use /api/tenant-auth/register.
 */
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "This endpoint is no longer available. Use /api/tenant-auth/register.",
      redirect: "/api/tenant-auth/register",
    },
    { status: 410 },
  );
}
