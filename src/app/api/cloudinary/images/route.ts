import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryImage } from "@/types/cloudinary";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { getTenantFolder, uploadToCloudinary } from "@/lib/cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(req: NextRequest) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const folder = await getTenantFolder(authResult.decoded.tenantId);

    const res = await cloudinary.api.resources({
      type: "upload",
      prefix: `${folder}/`,
      max_results: 100,
    });

    const images: CloudinaryImage[] = res.resources.map(
      (r: CloudinaryImage) => ({
        public_id: r.public_id,
        secure_url: r.secure_url,
        width: r.width,
        height: r.height,
        format: r.format,
        created_at: r.created_at,
        bytes: r.bytes,
        original_filename: r.original_filename,
      }),
    );

    return NextResponse.json({ images });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const form = await req.formData();
    const file = form.get("image");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    const base = await getTenantFolder(authResult.decoded.tenantId);
    const secure_url = await uploadToCloudinary(file, `${base}/landing`);

    return NextResponse.json({ secure_url });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 },
    );
  }
}
