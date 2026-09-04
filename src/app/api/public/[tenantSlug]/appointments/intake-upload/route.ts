/**
 * POST /api/public/[tenantSlug]/appointments/intake-upload
 *
 * Prima JEDNU referentnu fotografiju uz zakazivanje ("kako želite da izgleda").
 *
 * Javno je namerno: gost zakazuje bez naloga, pa upload mora da radi pre nego
 * što nalog i termin postoje. Zaštite umesto autentifikacije:
 *
 *   - tenant mora da postoji i da ima uključen booking (`requireCapability`)
 *   - samo slike, samo JPG/PNG/WebP — tip se proverava i po MIME-u i po
 *     onome što Cloudinary zaista prepozna
 *   - najviše 5 MB
 *   - folder je uvek tenantov; putanja ne dolazi iz zahteva
 *
 * Vraća `publicId` uz `url` — bez njega nema brisanja, thumbnail-a ni čišćenja.
 */
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { getTenantFolder } from "@/lib/cloudinary";
import { requireCapability } from "@/lib/platform/capabilities-server";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

type Params = { params: Promise<{ tenantSlug: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { tenantSlug } = await params;

  await connectToDB();
  const tenant = await Tenant.findOne({ slug: tenantSlug })
    .select("_id")
    .lean<{ _id: unknown } | null>();
  if (!tenant) {
    return NextResponse.json({ error: "Salon nije pronađen" }, { status: 404 });
  }
  const tenantId = String(tenant._id);
  const denied = await requireCapability(tenantId, "booking.services");
  if (denied) return denied;

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nema fajla" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Fotografija je prevelika (najviše 5 MB)." },
      { status: 413 },
    );
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Dozvoljeni formati: JPG, PNG i WebP." },
      { status: 415 },
    );
  }

  const folder = `${await getTenantFolder(tenantId)}/intake`;
  const buffer = Buffer.from(await file.arrayBuffer());

  return new Promise<NextResponse>((resolve) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        unique_filename: true,
        // Original od 5 MB nikome ne treba: ograniči najduži rub na 2000px.
        transformation: [{ width: 2000, height: 2000, crop: "limit" }],
      },
      (error, result) => {
        if (error || !result) {
          console.error("intake-upload:", error);
          resolve(
            NextResponse.json(
              { error: "Otpremanje nije uspelo. Pokušajte ponovo." },
              { status: 500 },
            ),
          );
          return;
        }
        resolve(
          NextResponse.json({
            publicId: result.public_id,
            url: result.secure_url,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            format: result.format,
          }),
        );
      },
    );
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    stream.pipe(uploadStream);
  });
}
