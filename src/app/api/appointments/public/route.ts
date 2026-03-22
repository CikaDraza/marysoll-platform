import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectToDB();

    // Dobavi query parametre (samo ako trebaju za filtere u budućnosti)
    const appointments = await Appointment.find({});

    return NextResponse.json(appointments);
  } catch (err) {
    console.error("GET /api/appointments/public error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
