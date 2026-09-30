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
  width?: number;
  height?: number;
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

export function tenantFolderSearchExpression(folder: string): string {
  const normalized = folder.trim().replace(/\/+$/, "");
  if (!normalized) throw new Error("Tenant Cloudinary folder nije definisan");
  // asset_folder is the dynamic-folder authority; public_id may be unrelated.
  return `(asset_folder=${JSON.stringify(normalized)} OR asset_folder:${JSON.stringify(`${normalized}/*`)})`;
}

export interface TenantCloudinaryUsage {
  totalBytes: number;
  assets: number;
  imageBytes: number;
  videoBytes: number;
  rawBytes: number;
}

/** Full dynamic-folder subtree, across every Search API page and resource type. */
export async function getTenantCloudinaryUsage(
  folder: string,
): Promise<TenantCloudinaryUsage> {
  const expression = `${tenantFolderSearchExpression(folder)} AND (resource_type:image OR resource_type:video OR resource_type:raw)`;
  const totals: TenantCloudinaryUsage = {
    totalBytes: 0,
    assets: 0,
    imageBytes: 0,
    videoBytes: 0,
    rawBytes: 0,
  };
  let cursor: string | undefined;
  const seenCursors = new Set<string>();
  do {
    let search = cloudinary.search.expression(expression).max_results(500);
    if (cursor) search = search.next_cursor(cursor);
    const page = (await search.execute()) as {
      resources?: Array<{ bytes?: number; resource_type?: string }>;
      next_cursor?: string;
    };
    if (!Array.isArray(page.resources)) {
      throw new Error("Cloudinary Search nije vratio listu assets");
    }
    for (const asset of page.resources) {
      if (
        !Number.isFinite(asset.bytes) ||
        asset.bytes == null ||
        asset.bytes < 0 ||
        !["image", "video", "raw"].includes(asset.resource_type ?? "")
      ) {
        throw new Error(
          "Cloudinary Search nije vratio potpun asset measurement",
        );
      }
      totals.totalBytes += asset.bytes;
      totals.assets += 1;
      if (asset.resource_type === "image") totals.imageBytes += asset.bytes;
      if (asset.resource_type === "video") totals.videoBytes += asset.bytes;
      if (asset.resource_type === "raw") totals.rawBytes += asset.bytes;
    }
    cursor = page.next_cursor;
    if (cursor) {
      if (seenCursors.has(cursor))
        throw new Error("Cloudinary Search cursor se ponavlja");
      seenCursors.add(cursor);
    }
  } while (cursor);
  return totals;
}

type CloudinaryResource = {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  created_at: string;
  bytes: number;
  original_filename?: string;
  filename?: string;
};

function mapResource(r: CloudinaryResource): CloudinaryResource {
  return {
    public_id: r.public_id,
    secure_url: r.secure_url,
    width: r.width,
    height: r.height,
    format: r.format,
    created_at: r.created_at,
    bytes: r.bytes,
    // Search API vraća `filename`, Admin API `original_filename`.
    original_filename: r.original_filename ?? r.filename ?? "",
  };
}

/**
 * Lista resurse tenant foldera, najnovije prvo.
 *
 * Koristi Search API jer je account u "dynamic folders" modu: slike uploadovane
 * direktno iz Cloudinary konzole imaju folder samo u `asset_folder`, dok im
 * `public_id` ostaje bez putanje (npr. `septembarski-termini_qxi5id`). Zbog toga
 * ih `api.resources({ prefix })` — koje pretražuje public_id — nikad ne vrati.
 * `folder:` izraz u Search-u pokriva oba slučaja.
 *
 * Fallback na prefix listanje ako Search padne (npr. rate limit 429), da lista
 * nikad ne ostane prazna.
 */
export async function listCloudinaryResources(
  folder: string,
  resourceType: "image" | "video" = "image",
): Promise<CloudinaryResource[]> {
  const newestFirst = (a: CloudinaryResource, b: CloudinaryResource) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

  try {
    const res = await cloudinary.search
      .expression(
        `resource_type:${resourceType} AND ${tenantFolderSearchExpression(folder)}`,
      )
      .sort_by("created_at", "desc")
      .max_results(100)
      .execute();
    return (res.resources as CloudinaryResource[]).map(mapResource);
  } catch (err) {
    console.error(
      "Cloudinary search failed, fallback na prefix listanje:",
      err,
    );
    const res = await cloudinary.api.resources({
      type: "upload",
      resource_type: resourceType,
      prefix: `${folder}/`,
      max_results: 500,
    });
    return (res.resources as CloudinaryResource[])
      .map(mapResource)
      .sort(newestFirst);
  }
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
  const result = await uploadToCloudinaryWithMetadata(
    file,
    folder,
    resourceType,
  );
  return result.secure_url;
}

/** Cloudinary's intrinsic dimensions are authoritative for favicon auto mode. */
export async function uploadToCloudinaryWithMetadata(
  file: File,
  folder: string,
  resourceType: "image" | "video" = "image",
): Promise<UploadResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result: UploadResult | undefined) => {
        if (error) reject(error);
        else if (result?.secure_url)
          resolve({
            secure_url: result.secure_url,
            width: result.width,
            height: result.height,
          });
        else reject(new Error("Cloudinary upload nije vratio URL."));
      },
    );

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
