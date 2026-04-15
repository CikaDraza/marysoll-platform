// app/api/testimonials/route.ts
import { NextResponse } from "next/server";
import { Testimonial } from "@/models/Testimonial";
import { FilterQuery, Types } from "mongoose";
import mongoose from "mongoose";
import {
  ITestimonial,
  CountResult,
  PaginationInfo,
  TestimonialsResponse,
} from "@/types";
import { connectToDB } from "@/lib/db/mongodb";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";

interface AggregationTestimonial {
  _id: mongoose.Types.ObjectId;
  clientProfileId: mongoose.Types.ObjectId;
  clientName: string;
  clientEmail: string;
  appointmentId: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  adminReply?: string;
  isRead: boolean;
  isClientRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PopulatedAppointment {
  _id: mongoose.Types.ObjectId;
  serviceName: string;
  date: string;
}

interface AggregationResult extends Omit<
  AggregationTestimonial,
  "appointmentId"
> {
  appointmentId: PopulatedAppointment;
  serviceName: string;
  appointmentDate: string;
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const isSuperAdmin = decoded.isSuperAdmin ?? false;

    // Tenant isolation gate — evaluated once, applied to both pipelines via filter.
    if (isSuperAdmin) {
      // SUPER_ADMIN may cross tenant boundaries — log every access.
      console.error(
        JSON.stringify({
          event: "SUPERADMIN_UNSCOPED_TESTIMONIALS_ACCESS",
          userId: decoded.id,
          path: req.url,
          timestamp: new Date().toISOString(),
        }),
      );
    } else if (!decoded.tenantId) {
      return NextResponse.json({ error: "Forbidden: no tenant context" }, { status: 403 });
    }

    // Osnovni filter
    const filter: FilterQuery<ITestimonial> = {};

    // Always scope to the caller's tenant.
    // Admin sees all testimonials in their tenant.
    // Client sees only their own testimonials in their tenant.
    // SUPER_ADMIN is intentionally unscoped (logged above).
    if (!isSuperAdmin && decoded.tenantId) {
      filter.tenantId = new Types.ObjectId(decoded.tenantId);
    }

    // Non-admin: additionally restrict to the caller's own email within this tenant.
    // Email alone is NOT a safe scope — the tenantId above is the isolation boundary.
    if (!decoded.isAdmin && !isSuperAdmin) {
      filter.clientEmail = decoded.email;
    }

    // Filter po statusu
    if (status === "read") {
      filter.isRead = true;
    } else if (status === "unread") {
      filter.isRead = false;
    }
    // "all" ne menja filter

    // Definiši pipeline korake sa striktnim tipovima
    const aggregationPipeline: mongoose.PipelineStage[] = [
      { $match: filter },
      {
        $lookup: {
          from: "appointments",
          localField: "appointmentId",
          foreignField: "_id",
          as: "appointmentId",
        },
      },
      {
        $unwind: {
          path: "$appointmentId",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          serviceName: "$appointmentId.serviceName",
          appointmentDate: "$appointmentId.date",
        } as const,
      },
    ];

    // Dodaj sortiranje
    aggregationPipeline.push({ $sort: { createdAt: -1 } });

    // Dodaj paginaciju
    aggregationPipeline.push({ $skip: skip }, { $limit: limit });

    // Pipeline za count
    const countPipeline: mongoose.PipelineStage[] = [
      { $match: filter },
      {
        $lookup: {
          from: "appointments",
          localField: "appointmentId",
          foreignField: "_id",
          as: "appointmentId",
        },
      },
      {
        $unwind: {
          path: "$appointmentId",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $count: "total" },
    ];

    // Izvrši upite
    const [testimonials, countResult] = await Promise.all([
      Testimonial.aggregate<AggregationResult>(aggregationPipeline),
      Testimonial.aggregate<CountResult>(countPipeline),
    ]);

    const totalCount = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Transformiši rezultate
    const formattedTestimonials: ITestimonial<{
      _id: string;
      serviceName: string;
      date: string;
    }>[] = testimonials.map((testimonial) => ({
      _id: testimonial._id.toString(),
      clientProfileId: testimonial.clientProfileId.toString(),
      clientName: testimonial.clientName,
      clientEmail: testimonial.clientEmail,
      appointmentId: {
        _id: testimonial.appointmentId?._id?.toString() || "",
        serviceName: testimonial.serviceName || "",
        date: testimonial.appointmentDate || "",
      },
      rating: testimonial.rating,
      comment: testimonial.comment,
      adminReply: testimonial.adminReply,
      isRead: testimonial.isRead,
      isClientRead: testimonial.isClientRead,
      createdAt: testimonial.createdAt.toISOString(),
      updatedAt: testimonial.updatedAt.toISOString(),
    }));

    const pagination: PaginationInfo = {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    const response: TestimonialsResponse = {
      testimonials: formattedTestimonials,
      pagination,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching testimonials:", error);
    return NextResponse.json(
      { error: "Error fetching testimonials" },
      { status: 500 },
    );
  }
}
