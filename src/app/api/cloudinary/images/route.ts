import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryImage } from "@/types/cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET() {
  try {
    const res = await cloudinary.api.resources({
      type: "upload",
      prefix: "salon/",
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
