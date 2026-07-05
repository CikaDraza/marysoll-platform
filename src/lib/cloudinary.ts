// lib/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import type { DecodedToken } from "@/types/auth/types";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Re-export konfigurisane instance — importovanjem ovog modula izvršava se
// gornji cloudinary.config(...) (single source of truth za kredencijale).
export { cloudinary };

export type UploadResult = {
  secure_url: string;
};

/**
 * Returns the Cloudinary folder for a given tenantId.
 * Uses the stored `cloudinaryFolder` field from the Tenant document.
 * Falls back to `salons/tenant-{id}` if tenant not found.
 */
export async function getTenantFolder(
  tenantId: string | null | undefined,
): Promise<string> {
  if (!tenantId) return "salons/default";
  await connectToDB();
  const tenant = (await Tenant.findById(tenantId)
    .select("cloudinaryFolder")
    .lean()) as { cloudinaryFolder?: string } | null;
  return tenant?.cloudinaryFolder ?? `salons/tenant-${tenantId}`;
}

const SUPERADMIN_IMAGE_FOLDER = "superadmin/images";

/** Bacano kad admin token nema tenantId (a nije superadmin). Rute ga mapiraju na 403. */
export class TenantRequiredError extends Error {
  constructor() {
    super("Tenant nije identifikovan");
    this.name = "TenantRequiredError";
  }
}

/** Folder za listanje Cloudinary resursa (deljen: cloudinary/images i /videos). */
export async function resolveCloudinaryListFolder(
  decoded: DecodedToken,
): Promise<string> {
  if (decoded.isSuperAdmin) return SUPERADMIN_IMAGE_FOLDER;
  if (!decoded.tenantId) throw new TenantRequiredError();
  return getTenantFolder(decoded.tenantId);
}

/** Folder za upload (tenant landing pod-folder); deljen između slika i videa. */
export async function resolveCloudinaryUploadFolder(
  decoded: DecodedToken,
): Promise<string> {
  if (decoded.isSuperAdmin) return SUPERADMIN_IMAGE_FOLDER;
  if (!decoded.tenantId) throw new TenantRequiredError();
  const base = await getTenantFolder(decoded.tenantId);
  return `${base}/landing`;
}

/**
 * Extracts the Cloudinary public_id from a secure_url.
 * Handles both versioned and non-versioned URLs.
 *
 * Example:
 *   https://res.cloudinary.com/cloud/image/upload/v1234/salons/salon-neonix/logo.jpg
 *   → salons/salon-neonix/logo
 */
function extractPublicId(fileUrl: string): string | null {
  if (!fileUrl) return null;
  // Match everything after /upload/ (skip optional version v123456/)
  const match = fileUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
  return match?.[1] ?? null;
}

export async function uploadToCloudinary(
  file: File,
  folder: string,
  resourceType: "image" | "video" = "image",
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result: UploadResult | undefined) => {
        if (error) reject(error);
        else resolve(result!.secure_url);
      },
    );

    const buffer = Buffer.from(await file.arrayBuffer());
    const bufferStream = new Readable();
    bufferStream.push(buffer);
    bufferStream.push(null);
    bufferStream.pipe(uploadStream);
  });
}

export async function uploadBase64ToCloudinary(
  base64: string,
  folder: string,
): Promise<UploadResult> {
  const result = await cloudinary.uploader.upload(base64, {
    folder,
    resource_type: "image",
  });
  return { secure_url: result.secure_url };
}

export async function deleteFromCloudinary(
  fileUrl: string,
  resourceType: "image" | "video" = "image",
) {
  if (!fileUrl) return;
  const publicId = extractPublicId(fileUrl);
  if (!publicId) {
    console.warn(
      "⚠️ deleteFromCloudinary: could not extract public_id from",
      fileUrl,
    );
    return;
  }
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
