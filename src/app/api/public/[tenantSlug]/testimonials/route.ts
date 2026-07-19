/**
 * GET /api/public/[tenantSlug]/testimonials?offset=0|3&limit=3
 *
 * Public, paginiran izvor za Theme-8 carousel. Vraća isključivo odobrene
 * utiske i najviše šest najnovijih kroz dve stranice po tri kartice.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { Testimonial } from "@/models/Testimonial";
import {
  publicTenantSlugSchema,
  publicTestimonialSchema,
  publicTestimonialsPageSchema,
  theme8TestimonialsQuerySchema,
} from "@/types/public-testimonials";
import { THEME8_DEVELOPMENT_TESTIMONIALS } from "@/helpers/theme8DevelopmentTestimonials";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ tenantSlug: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const rawParams = await params;
  const parsedParams = publicTenantSlugSchema.safeParse(rawParams);
  const parsedQuery = theme8TestimonialsQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );

  if (!parsedParams.success || !parsedQuery.success) {
    return NextResponse.json({ error: "Neispravan zahtev." }, { status: 400 });
  }

  try {
    await connectToDB();
    const tenant = await Tenant.findOne({
      slug: parsedParams.data.tenantSlug,
    })
      .select("_id")
      .lean();

    if (!tenant) {
      return NextResponse.json({ error: "Salon nije pronađen." }, { status: 404 });
    }

    const tenantId = String((tenant as { _id: unknown })._id);
    const { offset, limit } = parsedQuery.data;
    // Jedan dodatni dokument govori da li postoje još kartice, bez posebnog
    // countDocuments upita. Offset je schema-om ograničen na 0 ili 3.
    const rows = await Testimonial.find({
      tenantId,
      isApproved: true,
    })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit + 1)
      .lean();

    const developmentFixtures =
      process.env.NODE_ENV === "development" && offset === 3 && rows.length === 0
        ? THEME8_DEVELOPMENT_TESTIMONIALS
        : null;
    const testimonials = developmentFixtures
      ? developmentFixtures
      : rows.slice(0, limit).map((row) =>
        publicTestimonialSchema.parse({
          _id: String(row._id),
          clientName: String(row.clientName ?? ""),
          rating: Number(row.rating),
          comment: String(row.comment ?? ""),
          ...(row.adminReply ? { adminReply: String(row.adminReply) } : {}),
        }),
        );
    const response = publicTestimonialsPageSchema.parse({
      testimonials,
      // Carousel namerno staje posle druge stranice — najviše šest najnovijih.
      hasMore: offset === 0 && rows.length > limit,
    });

    return NextResponse.json(response, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (error) {
    console.error("GET /api/public/[tenantSlug]/testimonials:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
