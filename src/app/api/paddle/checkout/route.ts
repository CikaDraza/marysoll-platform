// src/app/api/paddle/checkout/route.ts
//
// POST /api/paddle/checkout
// Kreira Paddle transakciju (mesečna pretplata) za trenutni tenant i vraća
// transactionId. Klijent ga prosleđuje Paddle.js-u:
//   Paddle.Checkout.open({ transactionId })
//
// custom_data: { tenant_id, plan_code } se propagira na webhook evente.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth-server";
import { connectToDB } from "@/lib/db/mongodb";
import { Plan } from "@/models/Plan";
import { Subscription } from "@/models/Subscription";
import { createPaddleTransaction } from "@/lib/paddle";
import type { PlanName } from "@/lib/plans/planFeatures";

const PAID_PLANS: PlanName[] = ["claudia", "kiki", "enterprise"];

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.success) return auth.response;
  const { decoded } = auth;

  if (!decoded.tenantId) {
    return NextResponse.json({ error: "Tenant nije pronađen" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as { plan?: string } | null;
  const plan = body?.plan;

  if (!plan || !PAID_PLANS.includes(plan as PlanName)) {
    return NextResponse.json(
      { error: "Nevažeći plan. Dozvoljeni: claudia, kiki, enterprise" },
      { status: 400 },
    );
  }

  try {
    await connectToDB();

    const planDoc = await Plan.findOne({ slug: plan, isActive: true })
      .select("paddleMonthlyPriceId")
      .lean<{ paddleMonthlyPriceId: string | null }>();

    if (!planDoc?.paddleMonthlyPriceId) {
      return NextResponse.json(
        { error: `Plan "${plan}" nema konfigurisan Paddle price ID` },
        { status: 400 },
      );
    }

    // Ponovo iskoristi postojećeg Paddle customer-a ako tenant već ima pretplatu.
    const sub = await Subscription.findOne({ tenantId: decoded.tenantId })
      .select("paddleCustomerId")
      .lean<{ paddleCustomerId: string | null }>();

    const txn = await createPaddleTransaction({
      priceId: planDoc.paddleMonthlyPriceId,
      tenantId: decoded.tenantId,
      planCode: plan,
      customerId: sub?.paddleCustomerId ?? undefined,
      customerEmail: decoded.email ?? undefined,
    });

    return NextResponse.json({
      transactionId: txn.id,
      checkoutUrl: txn.checkoutUrl,
    });
  } catch (err) {
    console.error("POST /api/paddle/checkout:", err);
    return NextResponse.json(
      { error: "Greška pri kreiranju checkout-a" },
      { status: 500 },
    );
  }
}
