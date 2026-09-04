/**
 * GET /api/education/my-content — sadržaji dodeljeni prijavljenoj klijentkinji.
 *
 * Odgovor je namerno bez tela: lista pokazuje šta postoji, telo se čita tek na
 * zaštićenoj strani, i to kroz istu proveru dodele.
 */
import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";
import { listAssignedEducationContent } from "@/lib/education/entitlement";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    const decoded = token ? verifyToken(token) : null;

    // `tenantUserId` je klijentkinjin profil; bez oba nema ni pitanja o pristupu.
    if (!decoded?.tenantId || !decoded.tenantUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      items: await listAssignedEducationContent(
        decoded.tenantId,
        decoded.tenantUserId,
      ),
    });
  } catch (error) {
    console.error("[GET /api/education/my-content]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
