/**
 * POST /api/cloudinary/files — dokumenti Content Composer-a (PDF i slike).
 *
 * Ranije je ovaj kanal išao kroz `/api/admin/chat/upload`, pa su edukativni
 * materijali završavali u `{tenant}/chat` folderu, izmešani sa prilozima iz
 * četa. Isti tenant folder, ali svoj pod-folder: materijal nije poruka.
 */
import { NextRequest } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { getTenantFolder } from "@/lib/cloudinary";
import { uploadChatAttachment } from "@/lib/chat/uploadAttachment";

export async function POST(req: NextRequest) {
  const authResult: AdminAuthResult = await requireAdmin(req);
  if (!authResult.success) return authResult.response;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  // Validacija veličine i tipa je zajednička sa četom; razlikuje se samo cilj.
  const folder = await getTenantFolder(authResult.decoded.tenantId);
  return uploadChatAttachment(file, `${folder}/dokumenti`);
}
