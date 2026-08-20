// api/testimonials/create/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { verifyToken } from "@/lib/auth/auth-server";
import { tenantScopeFrom } from "@/lib/auth/tenantScope";
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

    // Tenant scope: provera ispod je bila samo po e-mailu, a isti e-mail sme da
    // postoji u VIŠE salona (unique je po paru tenant+email). Klijent salona A
    // je time mogao da ostavi utisak na termin salona B sa istim e-mailom.
    const scope = tenantScopeFrom(user);
    if (!scope.ok) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    const body = await req.json();
    const { appointmentId, rating, comment } = body;

    // Termin mora da postoji U OVOM salonu i da pripada pozivaocu.
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      ...scope.filter,
    });
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
