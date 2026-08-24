/**
 * DELETE /api/tenant-auth/delete-account
 *
 * TRAJNO BRISANJE SALONA — jedina destruktivna owner akcija.
 *
 * Uprkos istorijskom nazivu rute, ovo NIJE brisanje korisničkog naloga: briše
 * se ceo tenant boundary — salon, sav sadržaj, svi članovi (OWNER/ADMIN/STAFF/
 * USER/GUEST) i vlasnički platformski identitet, uz zaustavljanje buduće
 * naplate. Naziv rute je zadržan da ne uvodimo API churn.
 *
 * Cascade i ownership provere žive u `lib/tenant/deleteTenant.ts`, zajedno sa
 * superadmin rutom — dve ručne liste su se već bile razišle.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { requireAdmin } from "@/lib/auth/auth-server";
import { DecodedToken } from "@/types/auth/types";
import {
  deleteTenantPermanently,
  TenantDeletionError,
} from "@/lib/tenant/deleteTenant";

export async function DELETE(req: NextRequest) {
  const auth = requireAdmin(req) as { decoded: DecodedToken } | NextResponse;
  if (auth instanceof NextResponse) return auth;

  const { decoded } = auth;

  // Samo OWNER. ADMIN i STAFF ne mogu obrisati salon.
  if (decoded.globalRole !== "OWNER") {
    return NextResponse.json(
      { error: "Samo vlasnik salona može trajno obrisati salon." },
      { status: 403 },
    );
  }

  const tenantUserId = decoded.tenantUserId;
  const tenantId = decoded.tenantId;

  if (!tenantUserId || !tenantId) {
    return NextResponse.json({ error: "Neispravan token." }, { status: 400 });
  }

  try {
    await connectToDB();

    const caller = (await TenantUser.findById(tenantUserId)
      .select("authUserId role tenantId")
      .lean()) as unknown as {
      authUserId?: unknown;
      role?: string;
      tenantId?: unknown;
    } | null;

    if (!caller || caller.role !== "OWNER" || String(caller.tenantId) !== String(tenantId)) {
      return NextResponse.json(
        { error: "Samo vlasnik salona može trajno obrisati salon." },
        { status: 403 },
      );
    }

    const result = await deleteTenantPermanently({
      tenantId,
      expectedOwnerAuthUserId: caller.authUserId
        ? String(caller.authUserId)
        : null,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof TenantDeletionError) {
      const status = err.code === "TENANT_NOT_FOUND" ? 404 : 409;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error("[DELETE /api/tenant-auth/delete-account]", err);
    return NextResponse.json({ error: "Greška pri brisanju salona." }, { status: 500 });
  }
}
