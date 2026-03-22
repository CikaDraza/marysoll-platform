// api/testimonials/update/[id]/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { verifyToken } from "@/lib/auth/auth-server";
import { createTestimonialNotification } from "@/lib/notificationService";
import { Testimonial } from "@/models/Testimonial";

interface TestimonialForNotification {
  _id: string;
  clientId: string;
  clientName: string;
  rating: number;
  comment: string;
  adminReply?: string;
  isClientRead?: boolean;
  isRead?: boolean;
  appointmentId: {
    serviceName: string;
    _id: string;
    date?: string;
  };
}

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

    const body = await req.json();

    const { rating, comment, adminReply, isRead, isClientRead } = body;

    const oldTestimonial = await Testimonial.findById(id);

    if (!oldTestimonial) {
      return NextResponse.json(
        { error: "Testimonial not found" },
        { status: 404 },
      );
    }

    // Check permissions
    const isOwner = oldTestimonial.clientEmail === user.email;
    const isAdmin = user.isAdmin;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: TestimonialForNotification = {
      _id: oldTestimonial._id.toString(),
      clientId: oldTestimonial.clientId.toString(),
      clientName: oldTestimonial.clientName,
      rating: oldTestimonial.rating,
      comment: oldTestimonial.comment,
      adminReply: oldTestimonial.adminReply,
      isClientRead: oldTestimonial.isClientRead,
      isRead: oldTestimonial.isRead,
      appointmentId: {
        serviceName: oldTestimonial.appointmentId?.serviceName || "Usluga",
        _id: oldTestimonial.appointmentId?._id?.toString() || "",
        date: oldTestimonial.appointmentId?.date || "",
      },
    };

    if (isOwner) {
      // Klijent može da menja rating i comment
      if (
        rating !== oldTestimonial.rating ||
        comment !== oldTestimonial.comment
      )
        updateData.rating = rating;
      if (comment !== undefined) updateData.comment = comment;
      if (isClientRead !== undefined) updateData.isClientRead = isClientRead;
    }

    if (isAdmin) {
      // Admin može da doda odgovor i označi kao pročitano
      if (adminReply !== undefined && adminReply !== oldTestimonial.adminReply)
        updateData.adminReply = adminReply;
      if (isRead !== undefined) updateData.isRead = isRead;
    }

    // Ažuriraj testimonial
    const updatedTestimonial = await Testimonial.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    ).populate("appointmentId", "serviceName date");

    if (!updatedTestimonial) {
      return NextResponse.json(
        { error: "Testimonial not found" },
        { status: 404 },
      );
    }

    // Pošalji notifikacije
    if (
      user.isAdmin &&
      adminReply !== undefined &&
      adminReply !== oldTestimonial.adminReply
    ) {
      // Admin je odgovorio ili izmenio odgovor - obavesti klijenta
      await createTestimonialNotification(
        {
          _id: updatedTestimonial._id.toString(),
          clientId: updatedTestimonial.clientId.toString(),
          clientName: updatedTestimonial.clientName,
          rating: updatedTestimonial.rating,
          isRead: updatedTestimonial.isRead,
          isClientRead: updatedTestimonial.isClientRead,
          adminReply: updatedTestimonial.adminReply,
          comment: updatedTestimonial.comment,
          appointmentId: {
            serviceName:
              updatedTestimonial.appointmentId?.serviceName || "Usluga",
            _id: updatedTestimonial.appointmentId?._id?.toString() || "",
            date: updatedTestimonial.appointmentId?.date || "",
          },
        },
        "replied",
        {
          oldComment: oldTestimonial.comment,
        },
      );
    } else if (
      isOwner &&
      (rating !== oldTestimonial.rating || comment !== oldTestimonial.comment)
    ) {
      // Klijent je izmenio komentar ili ocenu - obavesti admina
      await createTestimonialNotification(
        {
          _id: updatedTestimonial._id.toString(),
          clientId: updatedTestimonial.clientId.toString(),
          clientName: updatedTestimonial.clientName,
          rating: updatedTestimonial.rating,
          isRead: updatedTestimonial.isRead,
          isClientRead: updatedTestimonial.isClientRead,
          adminReply: updatedTestimonial.adminReply,
          comment: updatedTestimonial.comment,
          appointmentId: {
            serviceName:
              updatedTestimonial.appointmentId?.serviceName || "Usluga",
            _id: updatedTestimonial.appointmentId?._id?.toString() || "",
            date: updatedTestimonial.appointmentId?.date || "",
          },
        },
        "updated",
        {
          oldComment: oldTestimonial.comment,
        },
      );
    }

    return NextResponse.json(updatedTestimonial);
  } catch (error) {
    console.error("Error updating testimonial:", error);
    return NextResponse.json(
      { error: "Error updating testimonial" },
      { status: 500 },
    );
  }
}
