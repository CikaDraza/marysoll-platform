// app/api/appointments/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { FilterQuery, Types } from "mongoose";
import mongoose from "mongoose";
import { IAppointment, PaginationInfo } from "@/types";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";
import { belgradeNowParts } from "@/lib/utils/belgradeTime";
import { TenantUser } from "@/models/TenantUser";
import {
  tokenizeSearch,
  buildClientSearchFilter,
  buildAppointmentSearchClauses,
  APPOINTMENT_CLIENT_FIELDS,
} from "@/lib/search/clientSearch";

export async function GET(req: Request) {
  try {
    await connectToDB();

    // Auth: decode token to extract tenantId.
    // The proxy already guards this route, but we re-verify here so direct
    // (non-browser) callers cannot bypass tenant scoping.
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const isSuperAdmin = decoded.isSuperAdmin ?? false;

    if (isSuperAdmin) {
      // SUPER_ADMIN may query across all tenants — log every such access.
      console.error(
        JSON.stringify({
          event: "SUPERADMIN_UNSCOPED_APPOINTMENTS_ACCESS",
          userId: decoded.id,
          path: req.url,
          timestamp: new Date().toISOString(),
        }),
      );
    } else if (!decoded.tenantId) {
      // Non-super-admin without a tenantId in token has no valid scope.
      return NextResponse.json({ error: "Forbidden: no tenant context" }, { status: 403 });
    }

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
    // Sve $and klauzule idu ovde pa se upisuju jednom na kraju — i pretraga i
    // "unmarked" filter koriste $and, a direktan upis bi jedan pregazio drugi.
    const andClauses: FilterQuery<IAppointment>[] = [];

    // Tenant isolation: always scope to the caller's tenant.
    // SUPER_ADMIN has no tenantId — intentionally unscoped (logged above).
    if (!isSuperAdmin && decoded.tenantId) {
      filter.tenantId = new Types.ObjectId(decoded.tenantId);
    }

    if (clientId) {
      if (Types.ObjectId.isValid(clientId)) {
        filter.clientProfileId = new Types.ObjectId(clientId);
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

    // ── Pretraga termina ──────────────────────────────────────────────────
    // Termin nosi clientName/clientEmail/clientInstagram, ali NEMA TikTok. Zato
    // se svaka reč traži i kroz profil klijenta (TenantUser), pa se poklopljeni
    // klijenti ubacuju preko clientProfileId. Time TikTok radi i za sve stare
    // termine, bez migracije podataka.
    const searchTokens = tokenizeSearch(search);
    if (searchTokens.length > 0) {
      const clientFilter = buildClientSearchFilter(
        search,
        APPOINTMENT_CLIENT_FIELDS,
      );

      // Jedan upit: svi klijenti koji se poklapaju sa BAR JEDNOM rečju.
      // Poklapanje po rečima se posle računa u memoriji, jer reč sme da se
      // poklopi sa profilom ILI sa poljem na samom terminu (npr.
      // "@tiktok_handle šišanje" — handle iz profila, usluga sa termina).
      const clientScope: FilterQuery<Record<string, unknown>> = {};
      if (!isSuperAdmin && decoded.tenantId) {
        clientScope.tenantId = new Types.ObjectId(decoded.tenantId);
      }
      const anyToken = clientFilter
        ? { $or: clientFilter.$and.flatMap((clause) => clause.$or) }
        : {};

      const candidates = await TenantUser.find(
        { ...clientScope, ...anyToken },
        { _id: 1, name: 1, email: 1, instagram: 1, tiktok: 1, phone: 1 },
      ).lean<
        Array<{
          _id: Types.ObjectId;
          name?: string;
          email?: string;
          instagram?: string;
          tiktok?: string;
          phone?: string;
        }>
      >();

      andClauses.push(...buildAppointmentSearchClauses(search, candidates));
    }

    if (date) {
      filter.date = date;
    }

    if (status === "pending") {
      filter.status = "pending";
    } else if (status === "approved") {
      filter.status = "appointment_approved";
    } else if (status === "rejected") {
      filter.status = "appointment_rejected";
    } else if (status === "rescheduled") {
      filter.status = "appointment_rescheduled";
    } else if (status === "cancelled") {
      filter.status = "appointment_cancelled";
    } else if (status === "completed") {
      filter.status = "completed";
    } else if (status === "no_show") {
      filter.status = "no_show";
    } else if (status === "unmarked") {
      // "Neoznačeni": odobreni termini koji su već počeli a admin ih još nije
      // označio kao završene / nedolazak. Datum i vreme su lokalni stringovi
      // ("YYYY-MM-DD", "HH:mm") pa poređenje stringova radi ispravno.
      const { dateStr, timeStr } = belgradeNowParts();
      filter.status = "appointment_approved";
      andClauses.push({
        $or: [
          { date: { $lt: dateStr } },
          { date: dateStr, time: { $lte: timeStr } },
        ],
      });
    }

    if (andClauses.length > 0) {
      filter.$and = andClauses;
    }

    // ── locate: na kojoj se strani nalazi konkretan termin ────────────────────
    // Koristi ga deep-link iz notifikacije (?tab=termini&appointmentId=...) da
    // prebaci paginaciju na stranu na kojoj taj termin zaista jeste.
    const locateId = searchParams.get("locate");
    if (locateId) {
      if (!Types.ObjectId.isValid(locateId)) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
      }
      const target = await Appointment.findOne({
        ...filter,
        _id: new Types.ObjectId(locateId),
      })
        .select("createdAt")
        .lean<{ _id: Types.ObjectId; createdAt: Date } | null>();

      if (!target) {
        return NextResponse.json({ found: false, page: null });
      }

      // Isti redosled kao lista (createdAt desc, pa _id desc): broj termina
      // ispred ciljanog određuje njegovu stranu.
      const before = await Appointment.countDocuments({
        $and: [
          filter,
          {
            $or: [
              { createdAt: { $gt: target.createdAt } },
              { createdAt: target.createdAt, _id: { $gt: target._id } },
            ],
          },
        ],
      });

      return NextResponse.json({
        found: true,
        page: Math.floor(before / limit) + 1,
      });
    }

    // Pipeline za paginaciju
    const aggregationPipeline: mongoose.PipelineStage[] = [
      { $match: filter },
      // _id kao tie-break: bez njega termini sa istim createdAt mogu da menjaju
      // redosled između strana, pa "locate" pokaže pogrešnu stranu.
      { $sort: { createdAt: -1, _id: -1 } },
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
