import { NextResponse } from "next/server";
import { requireEducationContentAuthority } from "@/lib/education/content-authority";
import { resolveEducationTaxonomyForTenant } from "@/lib/education/taxonomy-server";

export async function GET(request: Request) {
  try {
    const authority = await requireEducationContentAuthority(request);
    if (!authority.ok) return authority.response;

    const taxonomy = await resolveEducationTaxonomyForTenant(authority.tenantId);
    return NextResponse.json({ taxonomy });
  } catch (error) {
    console.error("[GET /api/education/taxonomy]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
