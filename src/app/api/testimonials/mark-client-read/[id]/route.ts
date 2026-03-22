import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { verifyToken } from "@/lib/auth/auth-server";
import { Testimonial } from "@/models/Testimonial";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  try {
    await connectToDB();
    const { id } = await params;

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const user = verifyToken(token);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ISPRAVKA: Ukloni uslov !user.isAdmin jer klijenti treba da mogu da označe svoje komentare
    const testimonial = await Testimonial.findOne({
      _id: id,
      clientEmail: user.email, // Samo svoje komentare
    });

    if (!testimonial) {
      return NextResponse.json(
        { error: "Testimonial not found" },
        { status: 404 },
      );
    }

    testimonial.isClientRead = true;
    await testimonial.save();

    await testimonial.populate("appointmentId", "serviceName date");

    return NextResponse.json(testimonial);
  } catch (error) {
    console.error("Error marking testimonial as read:", error);
    return NextResponse.json(
      { error: "Error marking testimonial as read" },
      { status: 500 },
    );
  }
}
