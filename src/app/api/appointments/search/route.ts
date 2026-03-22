import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";

interface AppointmentFilter {
  $or?: Array<{ [key: string]: { $regex: RegExp } }>;
  serviceName?: string;
  date?: string;
}

export async function GET(req: Request) {
  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim() ?? "";
    const serviceName = searchParams.get("serviceName")?.trim() ?? "";
    const date = searchParams.get("date")?.trim() ?? "";

    const filter: AppointmentFilter = {};

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
