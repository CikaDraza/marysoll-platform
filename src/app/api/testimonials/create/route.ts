// api/testimonials/create/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { verifyToken } from "@/lib/auth/auth-server";
import { TenantUser } from "@/models/TenantUser";
import { createTestimonialNotification } from "@/lib/notificationService";
import { Testimonial } from "@/models/Testimonial";

export async function POST(req: Request) {
  try {
    await connectToDB();

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const user = verifyToken(token);

    if (!user || user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.tenantUserId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 403 });
    }

    const body = await req.json();
    const { appointmentId, rating, comment } = body;

    // Proveri da li termin postoji i pripada korisniku
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return NextResponse.json(
        { error: "Termin nije pronađen" },
        { status: 404 },
      );
    }

    if (appointment.clientEmail !== user.email) {
      return NextResponse.json(
        { error: "Nemate pravo da komentarišete ovaj termin" },
        { status: 403 },
      );
    }

    // Check if testimonial already exists for this appointment
    const existingTestimonial = await Testimonial.findOne({
      appointmentId,
      clientEmail: user.email,
    });

    if (existingTestimonial) {
      return NextResponse.json(
        { error: "Već ste ostavili komentar za ovaj termin" },
        { status: 400 },
      );
    }

    // Get name from TenantUser
    const tenantUser = await TenantUser.findById(user.tenantUserId).select("name").lean<{ name: string }>();
    const clientName = tenantUser?.name || user.name || user.email.split("@")[0];

    const testimonial = await Testimonial.create({
      clientProfileId: user.tenantUserId,
      tenantId: user.tenantId,
      clientName,
      clientEmail: user.email,
      appointmentId: {
        serviceName: appointment.serviceName,
        date: appointment.date,
        _id: appointmentId,
      },
      rating,
      comment,
      isRead: false,
      isClientRead: false,
    });

    await testimonial.populate("appointmentId", "serviceName date");

    await createTestimonialNotification(testimonial, "created");

    return NextResponse.json(testimonial, { status: 201 });
  } catch (error) {
    console.error("Error creating testimonial:", error);
    return NextResponse.json(
      { error: "Error creating testimonial" },
      { status: 500 },
    );
  }
}
