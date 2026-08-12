import { NextRequest, NextResponse } from "next/server";
import { CloudinaryVideo } from "@/types/cloudinary";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import {
  cloudinary,
  resolveCloudinaryListFolder,
  resolveCloudinaryUploadFolder,
  TenantRequiredError,
  uploadToCloudinary,
} from "@/lib/cloudinary";

export async function GET(req: NextRequest) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const folder = await resolveCloudinaryListFolder(authResult.decoded);

    const res = await cloudinary.api.resources({
      type: "upload",
      resource_type: "video",
      prefix: `${folder}/`,
      max_results: 500,
    });

    // Isto kao kod slika: Cloudinary sortira po public_id, pa najnovije guramo na vrh.
    const videos: CloudinaryVideo[] = res.resources
      .map((r: CloudinaryVideo) => ({
        public_id: r.public_id,
        secure_url: r.secure_url,
        width: r.width,
        height: r.height,
        format: r.format,
        created_at: r.created_at,
        bytes: r.bytes,
        original_filename: r.original_filename,
      }))
      .sort(
        (a: CloudinaryVideo, b: CloudinaryVideo) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

    return NextResponse.json({ videos });
  } catch (err) {
    if (err instanceof TenantRequiredError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const form = await req.formData();
    const file = form.get("video");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "No video file provided" },
        { status: 400 },
      );
    }

    const folder = await resolveCloudinaryUploadFolder(authResult.decoded);
    const secure_url = await uploadToCloudinary(file, folder, "video");

    return NextResponse.json({ secure_url });
  } catch (err) {
    if (err instanceof TenantRequiredError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to upload video" },
      { status: 500 },
    );
  }
}
