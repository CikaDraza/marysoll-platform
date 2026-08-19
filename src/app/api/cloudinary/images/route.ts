import { NextRequest, NextResponse } from "next/server";
import { CloudinaryImage } from "@/types/cloudinary";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import {
  listCloudinaryResources,
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

    const images = (await listCloudinaryResources(
      folder,
      "image",
    )) as CloudinaryImage[];

    return NextResponse.json({ images });
  } catch (err) {
    if (err instanceof TenantRequiredError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
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

    const folder = await resolveCloudinaryUploadFolder(authResult.decoded);
    const secure_url = await uploadToCloudinary(file, folder);

    return NextResponse.json({ secure_url });
  } catch (err) {
    if (err instanceof TenantRequiredError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 },
    );
  }
}
