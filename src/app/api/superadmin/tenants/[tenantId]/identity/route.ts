/**
 * PATCH /api/superadmin/tenants/[tenantId]/identity
 *
 * SuperAdmin only. Directly updates slug, subdomain, customDomain, cloudinaryFolder.
 * Slug and subdomain are always kept in sync.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import {
  getPublicSlugAvailability,
  publicSlugConflictMessage,
} from "@/lib/platform/public-slugs";

type Params = { params: Promise<{ tenantId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await params;

  const body = await req.json().catch(() => ({})) as {
    slug?: string;
    customDomain?: string | null;
    cloudinaryFolder?: string;
  };

  await connectToDB();

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant nije pronađen" }, { status: 404 });
  }

  const updates: Record<string, string | boolean | null> = {};

  if (body.slug !== undefined) {
    const availability = await getPublicSlugAvailability(body.slug, {
      excludeTenantId: String(tenant._id),
    });
    const newSlug = availability.slug;
    if (!availability.available) {
      return NextResponse.json(
        { error: publicSlugConflictMessage(availability.conflict) },
        { status: availability.conflict === "invalid" ? 400 : 409 },
      );
    }
    if (newSlug !== tenant.slug) {
      updates.slug = newSlug;
      updates.subdomain = newSlug;
    }
  }

  if (body.customDomain !== undefined) {
    const domain = body.customDomain ? body.customDomain.trim().toLowerCase() : null;
    updates.customDomain = domain;
    if (!domain) {
      updates.customDomainVerified = false;
    }
  }

  if (body.cloudinaryFolder !== undefined) {
    const folder = body.cloudinaryFolder.trim();
    if (folder) updates.cloudinaryFolder = folder;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ message: "Nema promena" });
  }

  Object.assign(tenant, updates);
  await tenant.save();

  return NextResponse.json({
    success: true,
    message: "Podaci sačuvani.",
    slug: tenant.slug,
    subdomain: tenant.subdomain,
    customDomain: tenant.customDomain,
    cloudinaryFolder: tenant.cloudinaryFolder,
  });
}
