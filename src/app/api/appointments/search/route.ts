import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { Types } from "mongoose";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";

interface AppointmentFilter {
  $or?: Array<{ [key: string]: { $regex: RegExp } }>;
  serviceName?: string;
  date?: string;
  tenantId?: Types.ObjectId;
}

export async function GET(req: Request) {
  try {
    await connectToDB();

    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const isSuperAdmin = decoded.isSuperAdmin ?? false;

    if (isSuperAdmin) {
      console.error(
        JSON.stringify({
          event: "SUPERADMIN_UNSCOPED_APPOINTMENTS_SEARCH",
          userId: decoded.id,
          path: req.url,
          timestamp: new Date().toISOString(),
        }),
      );
    } else if (!decoded.tenantId) {
      return NextResponse.json({ error: "Forbidden: no tenant context" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim() ?? "";
    const serviceName = searchParams.get("serviceName")?.trim() ?? "";
    const date = searchParams.get("date")?.trim() ?? "";

    const filter: AppointmentFilter = {};

    // Tenant isolation: scope to the caller's tenant.
    if (!isSuperAdmin && decoded.tenantId) {
      filter.tenantId = new Types.ObjectId(decoded.tenantId);
    }

    // 🔍 Ako postoji query → pretraga po imenu, emailu, usluzi
    if (query) {
      const regex = new RegExp(query, "i");

      filter.$or = [
        { clientName: { $regex: regex } },
        { clientEmail: { $regex: regex } },
        { serviceName: { $regex: regex } },
      ];
    }

    // 🔍 Pretraga po usluzi
    if (serviceName) {
      filter.serviceName = serviceName;
    }

    // 🔍 Pretraga po datumu
    if (date) {
      filter.date = date; // format YYYY-MM-DD
    }

    const appointments = await Appointment.find(filter).sort({
      date: 1,
      time: 1,
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
