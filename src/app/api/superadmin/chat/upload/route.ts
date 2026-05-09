import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_SIZE = 20 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, "image" | "pdf"> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "application/pdf": "pdf",
};

// POST /api/superadmin/chat/upload — upload image or PDF to Cloudinary
export async function POST(req: NextRequest) {
  const authResult = requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fajl je prevelik (max 20MB)" }, { status: 413 });
  }

  const fileType = ALLOWED_TYPES[file.type];
  if (!fileType) {
    return NextResponse.json(
      { error: "Dozvoljeni formati: JPG, PNG, WebP, PDF" },
      { status: 415 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  return new Promise<NextResponse>((resolve) => {
    const resourceType = fileType === "pdf" ? "raw" : "image";

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "superadmin/chat",
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result) {
          resolve(NextResponse.json({ error: "Upload failed" }, { status: 500 }));
          return;
        }
        resolve(
          NextResponse.json({
            url: result.secure_url,
            type: fileType,
            name: file.name,
            size: file.size,
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
