import { NextRequest } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { getTenantFolder } from "@/lib/cloudinary";
import { uploadChatAttachment } from "@/lib/chat/uploadAttachment";

// POST /api/admin/chat/upload — upload image or PDF to Cloudinary
export async function POST(req: NextRequest) {
  const authResult: AdminAuthResult = await requireAdmin(req);
  if (!authResult.success) return authResult.response;
  const { decoded } = authResult;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  const folder = await getTenantFolder(decoded.tenantId);
  return uploadChatAttachment(file, `${folder}/chat`);
}
