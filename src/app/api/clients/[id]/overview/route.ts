import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { requireTenantAdmin } from "@/lib/auth/auth-server";
import { resolveTenantPlanFeatures } from "@/lib/plans/planEnforcement";
import { getClientOverview } from "@/lib/clients/clientOverview";
import {
  clientOverviewQuerySchema,
  clientOverviewSchema,
} from "@/types/client-overview";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = requireTenantAdmin(req);
  if (!auth.success) return auth.response;

  try {
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Klijent nije pronađen" }, { status: 404 });
    }
    const queryResult = clientOverviewQuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams),
    );
    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Nevalidni parametri", details: queryResult.error.flatten() },
        { status: 400 },
      );
    }

    const { features } = await resolveTenantPlanFeatures(auth.tenantId);
    if (!features.appointments) {
      return NextResponse.json(
        { error: "Vaš plan ne uključuje termine", feature: "appointments" },
        { status: 403 },
      );
    }

    const overview = await getClientOverview({
      tenantId: auth.tenantId,
      clientId: id,
      query: queryResult.data,
      // Client 360 statistika prati potpuno isti canonical gate kao salonska
      // statistika. Kiki preset i Superadmin `statistics` override prolaze kroz
      // isti effective-plan resolver i ne zavise direktno od evidentirane uplate.
      insightsAllowed: features.statistics,
    });
    if (!overview) {
      return NextResponse.json({ error: "Klijent nije pronađen" }, { status: 404 });
    }
    return NextResponse.json(clientOverviewSchema.parse(overview));
  } catch (error) {
    console.error("GET /api/clients/[id]/overview:", error);
    return NextResponse.json(
      { error: "Client 360 trenutno nije dostupan" },
      { status: 500 },
    );
  }
}
