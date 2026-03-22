import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Testimonial } from "@/models/Testimonial";

export async function GET() {
  try {
    await connectToDB();

    // Aggregation pipeline za dobijanje 5 najnovijih testimoniala od različitih osoba
    const uniqueTestimonials = await Testimonial.aggregate([
      {
        $match: {
          isRead: true,
        },
      },
      // Sortiraj od najnovijeg
      {
        $sort: { createdAt: -1 },
      },
      // Grupiši po klijentu (prvi će biti najnoviji zbog sortiranja)
      {
        $group: {
          _id: "$clientId",
          testimonial: { $first: "$$ROOT" },
          clientEmail: { $first: "$clientEmail" },
        },
      },
      // Vrati samo testimonial objekat
      {
        $replaceRoot: {
          newRoot: "$testimonial",
        },
      },
      // Ograniči na 5 rezultata
      {
        $limit: 5,
      },
    ]);

    // Transformacija podataka
    const transformedTestimonials = uniqueTestimonials.map((testimonial) => ({
      _id: testimonial._id?.toString(),
      clientId: testimonial.clientId.toString(),
      clientName: testimonial.clientName,
      clientEmail: testimonial.clientEmail,
      appointmentId: {
        _id: testimonial.appointmentId?.toString() || "",
        serviceName: testimonial.serviceName || "",
        date: testimonial.appointmentDate || "",
      },
      rating: testimonial.rating,
      comment: testimonial.comment,
      adminReply: testimonial.adminReply,
      isRead: testimonial.isRead,
      isClientRead: testimonial.isClientRead,
      createdAt:
        testimonial.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt:
        testimonial.updatedAt?.toISOString() || new Date().toISOString(),
    }));

    return NextResponse.json(transformedTestimonials);
  } catch (error) {
    console.error("Error fetching public testimonials:", error);
    return NextResponse.json(
      { error: "Error fetching testimonials" },
      { status: 500 }
    );
  }
}
