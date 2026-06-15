import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryVideo } from "@/types/cloudinary";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { getTenantFolder, uploadToCloudinary } from "@/lib/cloudinary";
import type { DecodedToken } from "@/types/auth/types";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const SUPERADMIN_IMAGE_FOLDER = "superadmin/images";

class TenantRequiredError extends Error {
  constructor() {
    super("Tenant nije identifikovan");
    this.name = "TenantRequiredError";
  }
}

async function resolveCloudinaryListFolder(decoded: DecodedToken) {
  if (decoded.isSuperAdmin) return SUPERADMIN_IMAGE_FOLDER;
  if (!decoded.tenantId) {
    throw new TenantRequiredError();
  }
  return getTenantFolder(decoded.tenantId);
}

async function resolveCloudinaryUploadFolder(decoded: DecodedToken) {
  if (decoded.isSuperAdmin) return SUPERADMIN_IMAGE_FOLDER;
  if (!decoded.tenantId) {
    throw new TenantRequiredError();
  }
  const base = await getTenantFolder(decoded.tenantId);
  return `${base}/landing`;
}

export async function GET(req: NextRequest) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const folder = await resolveCloudinaryListFolder(authResult.decoded);

    const res = await cloudinary.api.resources({
      type: "upload",
      resource_type: "video",
      prefix: `${folder}/`,
      max_results: 100,
    });

    const videos: CloudinaryVideo[] = res.resources.map(
      (r: CloudinaryVideo) => ({
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
