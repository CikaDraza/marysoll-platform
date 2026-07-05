import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { uploadChatAttachment } from "@/lib/chat/uploadAttachment";

// POST /api/superadmin/chat/upload — upload image or PDF to Cloudinary
export async function POST(req: NextRequest) {
  const authResult = requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  return uploadChatAttachment(file, "superadmin/chat");
}
