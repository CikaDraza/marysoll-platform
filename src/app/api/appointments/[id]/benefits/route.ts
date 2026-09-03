/**
 * Pogodnost na terminu — jedan ulaz za klijentkinju i za salon.
 *
 * GET    → šta se sme primeniti (i šta je već primenjeno)
 * POST   → primeni izabranu pogodnost (svoj vaučer ili points-shop nagradu)
 * DELETE → skini postojeću pogodnost
 *
 * Ruta je TANKA: ne računa popust, ne proverava saldo i ne odlučuje
 * eligibility. Sve to radi `lib/loyalty/redemption.ts`, isti seam za oba
 * pozivaoca — inače bi klijentski i admin tok vremenom razišli pravila.
 *
 * Telo zahteva nosi SAMO id izbora. `tenantId`, `clientProfileId`, cena u
 * poenima, vrednost nagrade i iznos popusta dolaze iz tokena i baze; poslati
 * ih iz browsera nema efekta jer ih seam ne prima.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";
import { actorScopeFrom, logSuperAdminAccess } from "@/lib/auth/tenantScope";
import { requireCapability } from "@/lib/platform/capabilities-server";
import {
  applyExistingVoucher,
  listAvailableBenefits,
  redeemPointsReward,
  removeBenefit,
  type RedemptionActor,
} from "@/lib/loyalty/redemption";
import { LoyaltyRedemptionError, loyaltyErrorStatus } from "@/lib/loyalty/errors";

const applySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("voucher"), voucherId: z.string().min(1) }),
  z.object({ kind: z.literal("points_shop"), offerId: z.string().min(1) }),
]);

interface ResolvedActor {
  actor: RedemptionActor;
  tenantId: string;
}

/**
 * Ko dela — iz tokena, nikad iz tela.
 *
 * SUPER_ADMIN se namerno tretira kao admin nad tenantom termina: platformski
 * administrator sme da pomogne salonu, ali pristup se loguje.
 */
async function resolveActor(
  req: NextRequest,
): Promise<ResolvedActor | NextResponse> {
  const token = getTokenFromRequest(req);
  const decoded = token ? verifyToken(token) : null;
  const scope = actorScopeFrom(decoded);
  if (!scope.ok) {
    return NextResponse.json({ error: scope.error }, { status: scope.status });
  }
  if (scope.isSuperAdmin) {
    logSuperAdminAccess("SUPERADMIN_APPOINTMENT_BENEFIT", decoded!, req.url);
  }

  const tenantId = decoded?.tenantId;
  if (!tenantId) {
    return NextResponse.json(
      { error: "Forbidden: no tenant context" },
      { status: 403 },
    );
  }
  const denied = await requireCapability(tenantId, "loyalty.rewards");
  if (denied) return denied;

  const actor: RedemptionActor =
    scope.actor === "client"
      ? { kind: "client", tenantId, tenantUserId: decoded!.tenantUserId! }
      : { kind: "admin", tenantId, adminTenantUserId: decoded?.tenantUserId ?? null };

  return { actor, tenantId };
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof LoyaltyRedemptionError) {
    return NextResponse.json(
      { error: error.message },
      { status: loyaltyErrorStatus(error) },
    );
  }
  console.error("[loyalty] benefit route failed:", error);
  return NextResponse.json(
    { error: "Greška pri obradi pogodnosti." },
    { status: 500 },
  );
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const resolved = await resolveActor(req);
  if (resolved instanceof NextResponse) return resolved;
  const { id } = await context.params;

  try {
    const benefits = await listAvailableBenefits({
      appointmentId: id,
      actor: resolved.actor,
    });
    return NextResponse.json(benefits);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const resolved = await resolveActor(req);
  if (resolved instanceof NextResponse) return resolved;
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nevalidan JSON" }, { status: 400 });
  }
  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Izaberite pogodnost koju želite da primenite." },
      { status: 400 },
    );
  }

  try {
    const result =
      parsed.data.kind === "voucher"
        ? await applyExistingVoucher({
            appointmentId: id,
            voucherId: parsed.data.voucherId,
            actor: resolved.actor,
          })
        : await redeemPointsReward({
            appointmentId: id,
            offerId: parsed.data.offerId,
            actor: resolved.actor,
          });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const resolved = await resolveActor(req);
  if (resolved instanceof NextResponse) return resolved;
  const { id } = await context.params;

  try {
    const result = await removeBenefit({
      appointmentId: id,
      actor: resolved.actor,
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
