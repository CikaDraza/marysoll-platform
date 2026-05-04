/**
 * PATCH /api/tenants/identity
 *
 * Admin-only. Allows the salon owner to change their tenant's slug
 * (which also updates subdomain) and cloudinaryFolder.
 *
 * On slug change: sends an email to SUPERADMIN_EMAIL notifying that
 * Vercel needs a new wildcard subdomain entry (if not already wildcard).
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { requireAdmin } from "@/lib/auth/auth-server";
import { sendEmail } from "@/lib/email/email";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 60);
}

export async function PATCH(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.success) return auth.response;

  const { decoded } = auth;
  if (!decoded.tenantId) {
    return NextResponse.json({ error: "Tenant nije pronađen" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as {
    slug?: string;
    cloudinaryFolder?: string;
  };

  const updates: Record<string, string> = {};
  let slugChanged = false;
  let oldSlug = "";
  let newSlug = "";

  await connectToDB();

  const tenant = await Tenant.findById(decoded.tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant nije pronađen" }, { status: 404 });
  }

  if (body.slug !== undefined) {
    newSlug = slugify(body.slug);
    if (!newSlug) {
      return NextResponse.json({ error: "Slug nije validan" }, { status: 400 });
    }

    if (newSlug !== tenant.slug) {
      const existing = await Tenant.findOne({ slug: newSlug, _id: { $ne: tenant._id } });
      if (existing) {
        return NextResponse.json({ error: "Slug je već zauzet" }, { status: 409 });
      }
      oldSlug = tenant.slug;
      updates.slug = newSlug;
      updates.subdomain = newSlug;
      slugChanged = true;
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

  if (slugChanged) {
    const superadminEmail = process.env.SUPERADMIN_EMAIL;
    if (superadminEmail) {
      const salonName = tenant.name;
      const tenantId = String(tenant._id);
      await sendEmail({
        to: superadminEmail,
        from: `"Marysoll Platform" <${process.env.EMAIL_FROM || "onboarding@resend.dev"}>`,
        subject: `[Marysoll] Salon promenio slug — potrebno Vercel podešavanje`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f8f8f8;">
            <div style="background:#fff;border-radius:12px;padding:32px;">
              <h2 style="margin:0 0 16px;color:#7c3aed;">Promena slug-a salona</h2>
              <p style="color:#374151;margin:0 0 12px;">Salon <strong>${salonName}</strong> je promenio slug.</p>
              <table style="border-collapse:collapse;width:100%;margin:16px 0;">
                <tr>
                  <td style="padding:8px 12px;background:#f3f4f6;color:#6b7280;font-size:13px;border-radius:4px 0 0 4px;">Stari slug</td>
                  <td style="padding:8px 12px;background:#fee2e2;color:#991b1b;font-family:monospace;font-size:13px;border-radius:0 4px 4px 0;">${oldSlug}</td>
                </tr>
                <tr><td colspan="2" style="height:4px;"></td></tr>
                <tr>
                  <td style="padding:8px 12px;background:#f3f4f6;color:#6b7280;font-size:13px;border-radius:4px 0 0 4px;">Novi slug</td>
                  <td style="padding:8px 12px;background:#d1fae5;color:#065f46;font-family:monospace;font-size:13px;border-radius:0 4px 4px 0;">${newSlug}</td>
                </tr>
                <tr><td colspan="2" style="height:4px;"></td></tr>
                <tr>
                  <td style="padding:8px 12px;background:#f3f4f6;color:#6b7280;font-size:13px;border-radius:4px 0 0 4px;">Tenant ID</td>
                  <td style="padding:8px 12px;background:#f3f4f6;font-family:monospace;font-size:12px;color:#374151;border-radius:0 4px 4px 0;">${tenantId}</td>
                </tr>
              </table>
              <p style="color:#374151;margin:16px 0 8px;font-weight:600;">Napomena:</p>
              <p style="color:#374151;margin:0;">
                Novi subdomen <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">${newSlug}.marysoll.com</code>
                je automatski aktivan (wildcard *.marysoll.com je konfigurisan).
                Ako salon koristi custom domen, potrebno je ažurirati DNS.
              </p>
            </div>
          </div>
        `,
      }).catch((err) => {
        console.error("Superadmin notification email failed:", JSON.stringify(err));
      });
    }
  }

  return NextResponse.json({
    success: true,
    message: slugChanged
      ? `Slug promenjen na "${newSlug}". Superadmin je obavešten.`
      : "Podaci sačuvani.",
    slug: tenant.slug,
    subdomain: tenant.subdomain,
    cloudinaryFolder: tenant.cloudinaryFolder,
  });
}
