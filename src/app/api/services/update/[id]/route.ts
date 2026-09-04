// src/app/api/services/update/[id]/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Service } from "@/models/Service";
import { requireAdmin } from "@/lib/auth/auth-server";
import { requireCapability } from "@/lib/platform/capabilities-server";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  try {
    await connectToDB();
    const auth = requireAdmin(req);
    if (!auth.success) return auth.response;
    const denied = await requireCapability(auth.decoded.tenantId, "services.catalog");
    if (denied) return denied;

    const body = await req.json();

    const { items, subscription } = body;

    const itemsArr =
      Array.isArray(items) && items.length > 0
        ? items
        : typeof items === "string" && items.trim().length > 0
        ? items
            .split(/\r?\n/)
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [];

    let subscriptionObj = undefined;
    if (subscription) {
      const enabled = Boolean(subscription.enabled);
      const priceMonthly = Number(subscription.priceMonthly) || 1;
      const discount = Number(subscription.discount) || 0;
      let finalPrice = 0;
      if (enabled && body.price != null) {
        finalPrice = Math.round(
          Number(body.price) * priceMonthly * (1 - discount / 100)
        );
      } else if (enabled) {
        // fetch existing price to compute
        const { id } = await params;
        const existing = await Service.findOne({
          _id: id,
          tenantId: auth.decoded.tenantId,
        });
        if (existing) {
          finalPrice = Math.round(
            existing.price * priceMonthly * (1 - discount / 100)
          );
        }
      }
      subscriptionObj = { enabled, priceMonthly, discount, finalPrice };
    }

    const { id } = await params;
    const updated = await Service.findOneAndUpdate(
      { _id: id, tenantId: auth.decoded.tenantId },
      {
        ...body,
      // `bookingIntake` se prihvata SAMO u podržanom obliku: browser ne sme
      // da ubaci proizvoljna polja u poslovnu konfiguraciju usluge.
      bookingIntake: { enabled: body?.bookingIntake?.enabled === true },
        items: itemsArr.length ? itemsArr : undefined,
        ...(subscriptionObj ? { subscription: subscriptionObj } : {}),
        price: body.price != null ? Number(body.price) : undefined,
        duration: body.duration != null ? Number(body.duration) : undefined,
      },
      { new: true, omitUndefined: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating service:", error);
    return NextResponse.json(
      { error: "Error updating service" },
      { status: 500 }
    );
  }
}
