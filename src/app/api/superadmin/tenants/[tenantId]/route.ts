/**
 * DELETE /api/superadmin/tenants/[tenantId]
 * Permanently deletes a tenant and all related data from the database.
 * SuperAdmin only.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { TenantUser } from "@/models/TenantUser";
import { Subscription } from "@/models/Subscription";
import { SalonProfile } from "@/models/SalonProfile";
import { Service } from "@/models/Service";
import { deleteTenantBookingData } from "@/lib/tenant/bookingCascade";
import { Appointment } from "@/models/Appointment";
import { Category } from "@/models/Category";
import { Testimonial } from "@/models/Testimonial";
import { Notification } from "@/models/Notification";
import { AudienceContact } from "@/models/AudienceContact";
import { AudienceSegment } from "@/models/AudienceSegment";
import { EmailCampaign } from "@/models/EmailCampaign";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { NewsletterLog } from "@/models/NewsletterLog";
import { CampaignEvent } from "@/models/CampaignEvent";
import { CampaignAnalytics } from "@/models/CampaignAnalytics";
import { SeoMeta } from "@/models/SeoMeta";
import { requireSuperAdmin } from "@/lib/auth/auth-server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await params;

  try {
    await connectToDB();

    const tenant = await Tenant.findById(tenantId).lean();
    if (!tenant) {
      return NextResponse.json({ error: "Salon nije pronađen" }, { status: 404 });
    }

    // Occupancy prvi: Slot se razrešava preko `salonId`, a `SalonProfile` se
    // briše u `Promise.all` ispod — posle njega salon više ne bi bio nalaziv.
    await deleteTenantBookingData(tenantId);

    await Promise.all([
      TenantUser.deleteMany({ tenantId }),
      Subscription.deleteMany({ tenantId }),
      SalonProfile.deleteMany({ tenantId }),
      Service.deleteMany({ tenantId }),
      Appointment.deleteMany({ tenantId }),
      Category.deleteMany({ tenantId }),
      Testimonial.deleteMany({ tenantId }),
      Notification.deleteMany({ tenantId }),
      AudienceContact.deleteMany({ tenantId }),
      AudienceSegment.deleteMany({ tenantId }),
      EmailCampaign.deleteMany({ tenantId }),
      NewsletterCampaign.deleteMany({ tenantId }),
      NewsletterLog.deleteMany({ tenantId }),
      CampaignEvent.deleteMany({ tenantId }),
      CampaignAnalytics.deleteMany({ tenantId }),
      SeoMeta.deleteMany({ tenantId }),
    ]);

    await Tenant.findByIdAndDelete(tenantId);

    return NextResponse.json({ success: true, message: "Salon je trajno obrisan" });
  } catch (err) {
    console.error("DELETE /api/superadmin/tenants/[tenantId]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
