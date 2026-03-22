// app/api/appointments/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { FilterQuery, Types } from "mongoose";
import mongoose from "mongoose";
import { IAppointment, PaginationInfo } from "@/types";

export async function GET(req: Request) {
  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const date = searchParams.get("date") || "";
    const status = searchParams.get("status") || "";
    const clientId = searchParams.get("clientId") || "";
    const skip = (page - 1) * limit;

    // Kreiraj filter
    const filter: FilterQuery<IAppointment> = {};

    if (clientId) {
      if (Types.ObjectId.isValid(clientId)) {
        filter.clientId = new Types.ObjectId(clientId);
      } else {
        return NextResponse.json({
          appointments: [],
          pagination: {
            page,
            limit,
            totalCount: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        });
      }
    }

    if (search) {
      filter.$or = [
        { clientName: { $regex: search, $options: "i" } },
        { clientEmail: { $regex: search, $options: "i" } },
        { serviceName: { $regex: search, $options: "i" } },
      ];
    }

    if (date) {
      filter.date = date;
    }

    if (status === "pending") {
      filter.status = "pending";
    } else if (status === "approved") {
      filter.status = "approved";
    } else if (status === "rejected") {
      filter.status = "rejected";
    } else if (status === "rescheduled") {
      filter.status = "rescheduled";
    } else if (status === "cancelled") {
      filter.status = "cancelled";
    }

    // Pipeline za paginaciju
    const aggregationPipeline: mongoose.PipelineStage[] = [
      { $match: filter },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
      { $unwind: "$metadata" },
    ];

    const result = await Appointment.aggregate(aggregationPipeline);

    const totalCount = result[0]?.metadata?.total || 0;
    const appointments = result[0]?.data || [];

    const totalPages = Math.ceil(totalCount / limit);

    const pagination: PaginationInfo = {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    return NextResponse.json({
      appointments,
      pagination,
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { error: "Error fetching appointments" },
      { status: 500 },
    );
  }
}
