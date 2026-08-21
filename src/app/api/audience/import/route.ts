/**
 * POST /api/audience/import
 *
 * Bulk-import contacts into AudienceContact for a tenant.
 * Requires admin auth. Each contact must have at minimum an email.
 * Duplicate emails (same email + tenantId) are upserted, not duplicated.
 *
 * Body:
 *   { contacts: Array<{ email, firstName?, lastName?, tags? }> }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { connectToDB } from "@/lib/db/mongodb";
import { AudienceContact } from "@/models/AudienceContact";
import { requireCapability } from "@/lib/platform/capabilities-server";
import { Types } from "mongoose";

interface ImportContactInput {
  email: string;
  firstName?: string;
  lastName?: string;
  tags?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const denied = await requireCapability(
      authResult.decoded.tenantId,
      "audience.contacts",
    );
    if (denied) return denied;

    const rawTenantId = authResult.decoded.tenantId;
    if (!rawTenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tenantId = new Types.ObjectId(rawTenantId);

    const body = (await req.json()) as { contacts: ImportContactInput[] };

    if (!Array.isArray(body.contacts) || body.contacts.length === 0) {
      return NextResponse.json(
        { error: "contacts array is required and must not be empty" },
        { status: 400 },
      );
    }

    await connectToDB();

    const ops = body.contacts
      .filter((c) => !!c.email?.trim())
      .map((c) => ({
        updateOne: {
          filter: { email: c.email.toLowerCase().trim(), tenantId },
          update: {
            $setOnInsert: {
              email: c.email.toLowerCase().trim(),
              firstName: c.firstName,
              lastName: c.lastName,
              tenantId,
              contactType: "LEAD" as const,
              source: "import" as const,
              tags: c.tags ?? [],
              subscribed: true,
              status: "ACTIVE" as const,
              openCount: 0,
              clickCount: 0,
              engagementScore: 0,
            },
          },
          upsert: true,
        },
      }));

    const result = await AudienceContact.bulkWrite(ops);

    return NextResponse.json(
      {
        imported: result.upsertedCount,
        skipped: result.matchedCount,
        total: ops.length,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[POST /api/audience/import]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
