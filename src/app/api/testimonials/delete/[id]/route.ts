// api/testimonials/delete/[id]/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { verifyToken } from "@/lib/auth/auth-server";
import { createTestimonialNotification } from "@/lib/notificationService";
import { Testimonial } from "@/models/Testimonial";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, { params }: Params) {
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

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return NextResponse.json(
        { error: "Testimonial not found" },
        { status: 404 },
      );
    }

    // Check permissions - samo admin može da obriše
    const isOwner = testimonial.clientEmail === user.email;
    const isAdmin = user.isAdmin;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await createTestimonialNotification(testimonial, "deleted", {
      reason: "Obrisano od strane admina",
    });

    await Testimonial.findByIdAndDelete(id);

    return NextResponse.json({ message: "Testimonial deleted successfully" });
  } catch (error) {
    console.error("Error deleting testimonial:", error);
    return NextResponse.json(
      { error: "Error deleting testimonial" },
      { status: 500 },
    );
  }
}
