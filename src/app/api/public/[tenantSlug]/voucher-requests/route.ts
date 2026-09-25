import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDB } from "@/lib/db/mongodb";
import { sendEmail } from "@/lib/email/email";
import { voucherRequestTemplate } from "@/lib/email/templates/voucherRequestTemplate";
import { instagramDmUrl } from "@/helpers/theme8Voucher";
import { voucherRequestInputSchema } from "@/lib/theme8/voucher-validation";
import { SalonProfile } from "@/models/SalonProfile";
import { Service } from "@/models/Service";
import { Tenant } from "@/models/Tenant";
import { VoucherRequest } from "@/models/VoucherRequest";

const slugSchema = z.string().regex(/^[a-z0-9-]{2,80}$/);
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
type Params = { params: Promise<{ tenantSlug: string }> };

function newRequestCode(): string {
  return `VR-${Array.from(randomBytes(5), (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("")}`;
}

function duplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export async function POST(request: NextRequest, { params }: Params) {
  const slug = slugSchema.safeParse((await params).tenantSlug);
  if (!slug.success) return NextResponse.json({ error: "Neispravan salon." }, { status: 400 });
  if (Number(request.headers.get("content-length") ?? 0) > 4096) {
    return NextResponse.json({ error: "Zahtev je prevelik." }, { status: 413 });
  }
  const parsed = voucherRequestInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Proverite ime, Instagram i izabranu tehniku." }, { status: 400 });
  }

  try {
    await connectToDB();
    const tenant = await Tenant.findOne({ slug: slug.data }).select("_id name").lean<{ _id: import("mongoose").Types.ObjectId; name: string }>();
    if (!tenant) return NextResponse.json({ error: "Salon nije pronađen." }, { status: 404 });

    const profile = await SalonProfile.findOne({ tenantId: tenant._id })
      .select("name email bookingEmail contactEmail social.instagram landingStructure.marketingBanners")
      .lean<{
        name: string;
        email: string;
        bookingEmail?: string;
        contactEmail?: string;
        social?: { instagram?: string };
        landingStructure?: { marketingBanners?: Array<{
          enabled: boolean;
          cta?: { enabled?: boolean; destination?: { type?: string } };
        }> };
      }>();
    const modalEnabled = profile?.landingStructure?.marketingBanners?.some((banner) =>
      banner.enabled && banner.cta?.enabled && banner.cta.destination?.type === "modal");
    if (!modalEnabled) return NextResponse.json({ error: "Poklon vaučer nije dostupan." }, { status: 404 });

    const dmUrl = instagramDmUrl(profile?.social?.instagram);
    const ownerEmail = profile?.bookingEmail || profile?.contactEmail || profile?.email;
    if (!dmUrl || !ownerEmail) {
      return NextResponse.json({ error: "Kontakt salona nije podešen." }, { status: 503 });
    }

    const service = await Service.findOne({ _id: parsed.data.serviceId, tenantId: tenant._id })
      .select("name basePrice priceMode")
      .lean<{ name: string; basePrice?: number; priceMode?: string }>();
    if (!service || !service.name?.trim() || !Number.isFinite(service.basePrice) ||
        (service.basePrice ?? 0) <= 0 || service.priceMode === "on_request" || service.priceMode === "from") {
      return NextResponse.json({ error: "Izabrana tehnika više nije dostupna za vaučer." }, { status: 422 });
    }

    const purchaserInstagram = `@${parsed.data.purchaserInstagram.replace(/^@/, "").toLowerCase()}`;
    const recent = await VoucherRequest.countDocuments({
      tenantId: tenant._id,
      purchaserInstagram,
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    });
    if (recent >= 3) {
      return NextResponse.json({ error: "Sačekajte pre slanja novog zahteva." }, { status: 429 });
    }

    let saved: { _id: import("mongoose").Types.ObjectId; requestCode: string } | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        saved = await VoucherRequest.create({
          tenantId: tenant._id,
          requestCode: newRequestCode(),
          purchaserName: parsed.data.purchaserName,
          purchaserInstagram,
          recipientName: parsed.data.recipientName,
          serviceId: parsed.data.serviceId,
          serviceName: service.name,
          servicePriceAtRequest: service.basePrice,
          status: "pending",
          notificationStatus: "pending",
        });
        break;
      } catch (error) {
        if (!duplicateKey(error)) throw error;
      }
    }
    if (!saved) return NextResponse.json({ error: "Pokušajte ponovo." }, { status: 503 });

    let notificationSent = false;
    try {
      await sendEmail({
        to: ownerEmail,
        subject: `🎁 Novi zahtev za vaučer — ${saved.requestCode}`,
        html: await voucherRequestTemplate({
          purchaserName: parsed.data.purchaserName,
          purchaserInstagram,
          recipientName: parsed.data.recipientName,
          serviceName: service.name,
          servicePriceAtRequest: service.basePrice!,
          requestCode: saved.requestCode,
        }),
      });
      notificationSent = true;
    } catch (error) {
      console.error("[voucher-request-email]", error);
    }
    try {
      await VoucherRequest.updateOne({ _id: saved._id }, { $set: { notificationStatus: notificationSent ? "sent" : "failed" } });
    } catch (error) {
      // The request already exists; do not ask the purchaser to resubmit it.
      console.error("[voucher-request-notification-status]", error);
    }

    const greetingName = profile.name.trim().split(/\s+/).at(-1) || "Anja";
    return NextResponse.json({
      requestCode: saved.requestCode,
      serviceName: service.name,
      notificationSent,
      dmUrl,
      greetingName,
    }, { status: 201 });
  } catch (error) {
    console.error("[voucher-requests]", error);
    return NextResponse.json({ error: "Zahtev trenutno nije moguće sačuvati." }, { status: 500 });
  }
}
