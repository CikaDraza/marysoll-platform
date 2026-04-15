import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDB } from "@/lib/db/mongodb";
import { AuthUser } from "@/models/AuthUser";

/**
 * POST /api/seed/superadmin
 *
 * One-time seed route for creating the superadmin account.
 * All sensitive values come from env vars — nothing sensitive in the request body.
 *
 * Required env vars: SEED_SECRET, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD
 * Optional env var:  SUPERADMIN_NAME (defaults to "Super Admin")
 *
 * Body: { secret: string }
 *
 * Creates an AuthUser with platformRole: "SUPER_ADMIN".
 * SuperAdmin has no TenantUser — they operate across all tenants.
 */
async function runSeed(secret: string | null) {
  const seedSecret = process.env.SEED_SECRET;
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!seedSecret) {
    return NextResponse.json(
      { error: "Seed endpoint is disabled (SEED_SECRET not configured)." },
      { status: 403 },
    );
  }

  if (!email || !password) {
    return NextResponse.json(
      { error: "SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set in env." },
      { status: 500 },
    );
  }

  if (!secret || secret !== seedSecret) {
    return NextResponse.json(
      { error: "Invalid seed secret." },
      { status: 401 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "SUPERADMIN_PASSWORD must be at least 8 characters." },
      { status: 500 },
    );
  }

  await connectToDB();

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await AuthUser.findOne({ email: normalizedEmail });
  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists." },
      { status: 409 },
    );
  }

  const hashed = await bcrypt.hash(password, 12);

  const authUser = await AuthUser.create({
    email: normalizedEmail,
    passwordHash: hashed,
    isEmailVerified: true,
    platformRole: "SUPER_ADMIN",
    verificationToken: null,
    verificationTokenExpiry: null,
    resetPasswordToken: null,
    resetPasswordExpires: null,
  });

  return NextResponse.json({
    success: true,
    message: "Superadmin created successfully.",
    user: {
      id: authUser._id,
      email: authUser.email,
      platformRole: authUser.platformRole,
    },
  });
}

/** GET /api/seed/superadmin?secret=... — trigger from browser */
export async function GET(req: NextRequest) {
  const host = req.headers.get("host") ?? "localhost";
  const { searchParams } = new URL(req.url, `http://${host}`);
  const secret = searchParams.get("secret");
  return runSeed(secret);
}

/** POST /api/seed/superadmin — { secret: string } */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { secret } = (body ?? {}) as { secret?: string };
  return runSeed(secret ?? null);
}
