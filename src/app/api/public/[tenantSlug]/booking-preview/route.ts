/**
 * POST /api/public/[tenantSlug]/booking-preview
 *
 * PRIKAZ toka zakazivanja — ne kreira termin i ne dodiruje nijednu booking
 * kolekciju. Jedini efekat je mejl vlasnici salona i superadminu, da vlasnica
 * može da prođe ceo tok na staging-u i vrati nam definitivne usluge, cene,
 * termine i pitanja.
 *
 * ZAŠTO NE UPISUJE: theme-9 ne sme da dobije booking write put pre T3 Booking
 * Engine-a (docs/TODO.md, Tvrde granice). Postojeće rute su race-unsafe, a
 * pisanje „samo za probu" bi napravilo četvrti write tok koji bi neko kasnije
 * morao da migrira.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { SalonProfile } from "@/models/SalonProfile";
import { AuthUser } from "@/models/AuthUser";
import { sendEmail } from "@/lib/email/email";
import { bookingPreviewTemplate } from "@/lib/email/templates/otherTemplates";

const bodySchema = z.object({
  offeringTitle: z.string().max(160).optional(),
  priceLabel: z.string().max(60).optional(),
  dateLong: z.string().max(60).optional(),
  time: z.string().max(20).optional(),
  returningClient: z.boolean(),
  intakeSkipped: z.boolean(),
  answers: z
    .array(z.object({ question: z.string().max(300), answer: z.string().max(300) }))
    .max(20),
  freeText: z.string().max(2000),
});

type Params = { params: Promise<{ tenantSlug: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { tenantSlug } = await params;

  try {
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Neispravan zahtev." }, { status: 400 });
    }

    await connectToDB();

    const tenant = await Tenant.findOne({ slug: tenantSlug })
      .select("_id name")
      .lean<{ _id: import("mongoose").Types.ObjectId; name: string }>();
    if (!tenant) {
      return NextResponse.json({ error: "Salon nije pronađen." }, { status: 404 });
    }

    const profile = await SalonProfile.findOne({ tenantId: tenant._id })
      .select("name email contactEmail bookingEmail themeBookingPreview")
      .lean<{
        name: string;
        email: string;
        contactEmail?: string;
        bookingEmail?: string;
        themeBookingPreview?: { enabled?: boolean };
      }>();

    // Bez uključenog prikaza nema ni slanja — ruta ne sme da bude otvoren relej.
    if (!profile?.themeBookingPreview?.enabled) {
      return NextResponse.json({ error: "Prikaz nije aktivan." }, { status: 404 });
    }

    const ownerEmail =
      profile.bookingEmail || profile.contactEmail || profile.email;

    const superAdmins = await AuthUser.find({ platformRole: "SUPER_ADMIN" })
      .select("email")
      .lean<{ email: string }[]>();

    const recipients = Array.from(
      new Set([ownerEmail, ...superAdmins.map((a) => a.email)].filter(Boolean)),
    );
    if (recipients.length === 0) {
      return NextResponse.json({ error: "Nema primaoca." }, { status: 500 });
    }

    const html = await bookingPreviewTemplate({
      salonName: profile.name || tenant.name,
      ...parsed.data,
    });

    await sendEmail({
      to: recipients,
      subject: `Proba zakazivanja — ${profile.name || tenant.name}`,
      html,
    });

    return NextResponse.json({ success: true, sentTo: recipients.length });
  } catch (error) {
    console.error("❌ booking-preview:", error);
    return NextResponse.json({ error: "Greška na serveru." }, { status: 500 });
  }
}
