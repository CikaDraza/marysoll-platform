/**
 * PUT /api/subscriptions/override/[tenantId]
 * DELETE /api/subscriptions/override/[tenantId]
 *
 * SuperAdmin: privremeno aktivira/deaktivira feature-e za testiranje.
 *
 * PUT body: { overrides: Partial<PlanFeatures>, expiresAt: ISO string, note: string }
 * DELETE:   uklanja override
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { connectToDB } from "@/lib/db/mongodb";
import type { PlanFeatures } from "@/lib/plans/planFeatures";
import { Subscription } from "@/models/Subscription";

type Params = { params: Promise<{ tenantId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await params;

  try {
    await connectToDB();

    const body = (await req.json()) as {
      overrides: Partial<PlanFeatures>;
      expiresAt: string;
      note: string;
    };

    if (!body.overrides || !body.expiresAt) {
      return NextResponse.json(
        { error: "overrides i expiresAt su obavezni" },
        { status: 400 },
      );
    }

    const expiresAt = new Date(body.expiresAt);
    if (isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      return NextResponse.json(
        { error: "expiresAt mora biti budući datum" },
        { status: 400 },
      );
    }

    const now = new Date();
    const updated = await Subscription.findOneAndUpdate(
      { tenantId },
      {
        $set: {
          featureOverrides: body.overrides,
          overrideExpiresAt: expiresAt,
          overrideNote: body.note ?? "",
        },
        $setOnInsert: {
          tenantId,
          plan: "free",
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
        },
      },
      { new: true, upsert: true },
    );

    return NextResponse.json({
      success: true,
      message: `Override aktivan do ${expiresAt.toLocaleDateString("sr-RS")}`,
      featureOverrides: updated.featureOverrides,
      overrideExpiresAt: updated.overrideExpiresAt?.toISOString(),
      overrideNote: updated.overrideNote,
    });
  } catch (err) {
    console.error("PUT /api/subscriptions/override:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await params;

  try {
    await connectToDB();

    await Subscription.findOneAndUpdate(
      { tenantId },
      {
        $set: {
          featureOverrides: null,
          overrideExpiresAt: null,
          overrideNote: null,
        },
      },
    );

    return NextResponse.json({ success: true, message: "Override uklonjen" });
  } catch (err) {
    console.error("DELETE /api/subscriptions/override:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
