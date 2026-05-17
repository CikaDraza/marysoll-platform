/**
 * GET /api/marketplace/appointments?clientEmail=...&page=1&limit=10
 *
 * Cross-tenant client appointments endpoint.
 * Protected by HMAC signature — server-to-server only.
 * Does NOT use tenant-scoped JWT; identity is asserted via clientEmail
 * which the calling server extracts from the user's verified Bearer token.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { verifySignature } from "@/lib/middleware/verifySignature";

export async function GET(req: NextRequest) {
  const verify = verifySignature(req, "");
  if (!verify.ok) {
    return NextResponse.json({ error: verify.error }, { status: verify.status });
  }

  const { searchParams } = new URL(req.url);
  const clientEmail = searchParams.get("clientEmail")?.toLowerCase().trim();

  if (!clientEmail) {
    return NextResponse.json({ error: "clientEmail je obavezan." }, { status: 400 });
  }

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));
  const skip = (page - 1) * limit;

  try {
    await connectToDB();

    const filter = { clientEmail: { $regex: `^${clientEmail}$`, $options: "i" } };

    const [appointments, totalCount] = await Promise.all([
      Appointment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Appointment.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    return NextResponse.json({
      appointments,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("GET /api/marketplace/appointments error:", error);
    return NextResponse.json({ error: "Greška na serveru." }, { status: 500 });
  }
}
