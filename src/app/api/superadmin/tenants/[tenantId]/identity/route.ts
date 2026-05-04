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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 60);
}

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
    const newSlug = slugify(body.slug);
    if (!newSlug) {
      return NextResponse.json({ error: "Slug nije validan" }, { status: 400 });
    }
    if (newSlug !== tenant.slug) {
      const existing = await Tenant.findOne({ slug: newSlug, _id: { $ne: tenant._id } });
      if (existing) {
        return NextResponse.json({ error: "Slug je već zauzet" }, { status: 409 });
      }
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
