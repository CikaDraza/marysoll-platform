// app/api/newsletter/subscribers/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { AudienceContact } from "@/models/AudienceContact";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { resolveNewsletterAdminScope } from "@/lib/newsletter/adminTenantScope";
import {
  normalizePlatformAudienceFilter,
  platformAudienceContactTypeCondition,
} from "@/lib/newsletter/audienceFilter";
import { Types } from "mongoose";

export async function GET(request: Request) {
  await connectToDB();

  const authResult: AdminAuthResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const newsletterScope = await resolveNewsletterAdminScope(
    request,
    authResult.decoded,
  );
  if (!newsletterScope) {
    return NextResponse.json(
      { error: "Newsletter scope nije validan" },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  if (newsletterScope.scope === "platform") {
    const platformContactConditions: Record<string, unknown>[] = [
      {
        $or: [{ tenantId: { $exists: false } }, { tenantId: null }],
      },
    ];

    const audienceFilter = normalizePlatformAudienceFilter(
      searchParams.get("audience"),
    );

    const contactFilter: Record<string, unknown> = {
      $and: platformContactConditions,
      subscribed: true,
      status: "ACTIVE",
      ...platformAudienceContactTypeCondition(audienceFilter),
    };

    if (search) {
      const regex = new RegExp(search, "i");
      platformContactConditions.push({
        $or: [
          { email: { $regex: regex } },
          { firstName: { $regex: regex } },
          { lastName: { $regex: regex } },
        ],
      });
    }

    const contacts = await AudienceContact.find(contactFilter)
      .select("email firstName lastName")
      .skip(skip)
      .limit(limit)
      .lean<
        {
          _id: Types.ObjectId;
          email: string;
          firstName?: string;
          lastName?: string;
        }[]
      >();

    const subscribers = contacts.map((c) => ({
      _id: c._id.toString(),
      email: c.email,
      name:
        [c.firstName, c.lastName].filter(Boolean).join(" ") ||
        c.email.split("@")[0],
      source: "platform",
    }));

    return NextResponse.json({
      subscribers,
      pagination: {
        page,
        limit,
        total: subscribers.length,
        pages: Math.ceil(subscribers.length / limit),
      },
    });
  }

  const tenantId = newsletterScope.tenantId;

  // Get registered tenant subscribers — email is now on TenantUser directly
  const registeredFilter: Record<string, unknown> = {
    tenantId: new Types.ObjectId(tenantId),
    "newsletterPreferences.subscribed": true,
  };
  if (search) {
    const regex = new RegExp(search, "i");
    registeredFilter.$or = [
      { email: { $regex: regex } },
      { name: { $regex: regex } },
    ];
  }

  const tenantUsersRaw = await TenantUser.find(registeredFilter)
    .select("_id email name")
    .skip(skip)
    .limit(limit)
    .lean<{ _id: Types.ObjectId; email: string; name: string }[]>();

  const registered = tenantUsersRaw.map((tu) => ({
    _id: tu._id.toString(),
    email: tu.email,
    name: tu.name || tu.email.split("@")[0],
    source: "registered",
  }));

  // Get anonymous AudienceContact subscribers for this tenant
  const contactFilter: Record<string, unknown> = {
    tenantId: new Types.ObjectId(tenantId),
    subscribed: true,
    status: "ACTIVE",
  };

  if (search) {
    const regex = new RegExp(search, "i");
    contactFilter.$or = [
      { email: { $regex: regex } },
      { firstName: { $regex: regex } },
      { lastName: { $regex: regex } },
    ];
  }

  const contacts = await AudienceContact.find(contactFilter)
    .select("email firstName lastName")
    .skip(skip)
    .limit(limit)
    .lean<{ _id: Types.ObjectId; email: string; firstName?: string; lastName?: string }[]>();

  const anonymous = contacts.map((c) => ({
    _id: c._id.toString(),
    email: c.email,
    name: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email.split("@")[0],
    source: "newsletter",
  }));

  const total = registered.length + anonymous.length;

  return NextResponse.json({
    subscribers: [...registered, ...anonymous],
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}
