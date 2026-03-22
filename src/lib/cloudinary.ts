// app/lib/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
// TIPOVI
export type UploadResult = {
  secure_url: string;
};

export async function uploadToCloudinary(
  file: File,
  folder = "salon",
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
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
  folder = "salon",
): Promise<UploadResult> {
  const result = await cloudinary.uploader.upload(
    `data:image/jpeg;base64,${base64}`,
    {
      folder,
      resource_type: "image",
    },
  );

  return {
    secure_url: result.secure_url,
  };
}

export async function deleteFromCloudinary(fileUrl: string) {
  if (!fileUrl) return;

  const publicId = fileUrl.split("/").slice(-1)[0].split(".")[0];

  return cloudinary.uploader.destroy(`salon/${publicId}`, {
    resource_type: "image",
  });
}
