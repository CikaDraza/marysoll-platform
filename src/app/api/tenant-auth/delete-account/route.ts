// DELETE /api/tenant-auth/delete-account
// Permanently deletes the calling OWNER's account and all associated data.
// Requires a valid tenant token (OWNER role only).
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { AuthUser } from "@/models/AuthUser";
import { Tenant } from "@/models/Tenant";
import { SalonProfile } from "@/models/SalonProfile";
import { Subscription } from "@/models/Subscription";
import { Appointment } from "@/models/Appointment";
import { Service } from "@/models/Service";
import { Testimonial } from "@/models/Testimonial";
import { Notification } from "@/models/Notification";
import { Slot } from "@/models/Slot";
import { EmailCampaign } from "@/models/EmailCampaign";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { NewsletterTemplate } from "@/models/NewsletterTemplate";
import { AudienceContact } from "@/models/AudienceContact";
import { AudienceSegment } from "@/models/AudienceSegment";
import { requireAdmin } from "@/lib/auth/auth-server";
import { DecodedToken } from "@/types/auth/types";

export async function DELETE(req: NextRequest) {
  const auth = requireAdmin(req) as { decoded: DecodedToken } | NextResponse;
  if (auth instanceof NextResponse) return auth;

  const { decoded } = auth;

  if (decoded.globalRole !== "OWNER") {
    return NextResponse.json(
      { error: "Samo vlasnik salona može obrisati nalog." },
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

    // Fetch TenantUser to get authUserId before deletion
    const tenantUser = await TenantUser.findById(tenantUserId).lean() as {
      authUserId?: import("mongoose").Types.ObjectId | null;
    } | null;

    // Cascade delete all tenant data
    await Promise.all([
      TenantUser.deleteMany({ tenantId }),
      SalonProfile.findOneAndDelete({ tenantId }),
      Subscription.deleteMany({ tenantId }),
      Appointment.deleteMany({ tenantId }),
      Service.deleteMany({ tenantId }),
      Testimonial.deleteMany({ tenantId }),
      Notification.deleteMany({ tenantId }),
      Slot.deleteMany({ tenantId }),
      EmailCampaign.deleteMany({ tenantId }),
      NewsletterCampaign.deleteMany({ tenantId }),
      NewsletterTemplate.deleteMany({ tenantId }),
      AudienceContact.deleteMany({ tenantId }),
      AudienceSegment.deleteMany({ tenantId }),
    ]);

    await Tenant.findByIdAndDelete(tenantId);

    if (tenantUser?.authUserId) {
      await AuthUser.findByIdAndDelete(tenantUser.authUserId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/tenant-auth/delete-account]", err);
    return NextResponse.json({ error: "Greška pri brisanju naloga." }, { status: 500 });
  }
}
