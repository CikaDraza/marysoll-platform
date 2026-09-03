/**
 * Appointment Checkout — pregled računa i završetak termina.
 *
 * GET  → server-računat pregled (cena pre pogodnosti, popust, za naplatu,
 *        predlog stvarno naplaćenog, očekivana zarada)
 * POST → završi termin sa potvrđenim iznosima
 *
 * ADMIN ONLY: od završetka zavisi dodela nagrada, pa klijentkinja ne sme sama
 * da „završi" svoj termin. Sva aritmetika je u `lib/appointments/checkout.ts`
 * — modal ne računa `3500 - 500` niti poene.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/auth-server";
import { requireCapability } from "@/lib/platform/capabilities-server";
import {
  completeAppointmentCheckout,
  previewAppointmentCheckout,
  type CheckoutActor,
} from "@/lib/appointments/checkout";
import { LoyaltyRedemptionError, loyaltyErrorStatus } from "@/lib/loyalty/errors";

const amountsSchema = z.object({
  /** UKUPNA dogovorena cena pre pogodnosti. */
  agreedPrice: z.number().min(0).max(10_000_000).nullish(),
  /** Stvarno naplaćeno. */
  chargedAmount: z.number().min(0).max(10_000_000).nullish(),
});

function errorResponse(error: unknown): NextResponse {
  if (error instanceof LoyaltyRedemptionError) {
    return NextResponse.json(
      { error: error.message },
      { status: loyaltyErrorStatus(error) },
    );
  }
  console.error("[checkout] route failed:", error);
  return NextResponse.json(
    { error: "Greška pri obradi završetka termina." },
    { status: 500 },
  );
}

function numberParam(value: string | null): number | null {
  if (value == null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = requireAdmin(req);
  if (!auth.success) return auth.response;
  const denied = await requireCapability(auth.decoded.tenantId, "booking.services");
  if (denied) return denied;

  const { id } = await context.params;
  const actor: CheckoutActor = {
    tenantId: auth.decoded.tenantId!,
    adminTenantUserId: auth.decoded.tenantUserId ?? null,
  };
  const params = req.nextUrl.searchParams;

  try {
    const preview = await previewAppointmentCheckout({
      appointmentId: id,
      actor,
      amounts: {
        agreedPrice: numberParam(params.get("agreedPrice")),
        chargedAmount: numberParam(params.get("chargedAmount")),
      },
    });
    return NextResponse.json(preview);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = requireAdmin(req);
  if (!auth.success) return auth.response;
  const denied = await requireCapability(auth.decoded.tenantId, "booking.services");
  if (denied) return denied;

  const { id } = await context.params;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // Prazno telo je legitiman „završi bez cene".
  }
  const parsed = amountsSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Iznos mora biti broj veći ili jednak nuli." },
      { status: 400 },
    );
  }

  try {
    const result = await completeAppointmentCheckout({
      appointmentId: id,
      actor: {
        tenantId: auth.decoded.tenantId!,
        adminTenantUserId: auth.decoded.tenantUserId ?? null,
      },
      amounts: {
        agreedPrice: parsed.data.agreedPrice ?? null,
        chargedAmount: parsed.data.chargedAmount ?? null,
      },
      source: "admin",
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
