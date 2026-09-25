import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDB } from "@/lib/db/mongodb";
import { instagramDmUrl, isInstagramDmLink } from "@/helpers/theme8Voucher";
import { SalonProfile } from "@/models/SalonProfile";
import { Tenant } from "@/models/Tenant";
import { Theme8LandingEvent } from "@/models/Theme8LandingEvent";

const slugSchema = z.string().regex(/^[a-z0-9-]{2,80}$/);
type Params = { params: Promise<{ tenantSlug: string }> };

/** Native form POST is click-only, with no Link prefetch or client JS dependency. */
export async function POST(_request: Request, { params }: Params) {
  const parsed = slugSchema.safeParse((await params).tenantSlug);
  if (!parsed.success) return NextResponse.json({ error: "Neispravan salon." }, { status: 400 });

  try {
    await connectToDB();
    const tenant = await Tenant.findOne({ slug: parsed.data }).select("_id").lean<{ _id: import("mongoose").Types.ObjectId }>();
    if (!tenant) return NextResponse.json({ error: "Salon nije pronađen." }, { status: 404 });

    const profile = await SalonProfile.findOne({ tenantId: tenant._id })
      .select("landingStructure.marketingBanners")
      .lean<{
        landingStructure?: { marketingBanners?: Array<{
          id: string;
          enabled: boolean;
          cta?: { enabled?: boolean; destination?: { type?: string; url?: string } };
        }> };
      }>();
    const banner = profile?.landingStructure?.marketingBanners?.find((item) => item.id === "education");
    const destinationUrl = banner?.enabled && banner.cta?.enabled && banner.cta.destination?.type === "custom"
      ? banner.cta.destination.url ?? ""
      : "";
    const destination = isInstagramDmLink(destinationUrl) ? instagramDmUrl(destinationUrl) : null;
    if (!destination) return NextResponse.json({ error: "Edukacioni DM nije dostupan." }, { status: 404 });

    await Theme8LandingEvent.create({
      tenantId: tenant._id,
      eventName: "education_dm_clicked",
      bannerId: "education",
    });
    return NextResponse.redirect(destination, { status: 303, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[education-dm]", error);
    return NextResponse.json({ error: "Pokušajte ponovo." }, { status: 503 });
  }
}
