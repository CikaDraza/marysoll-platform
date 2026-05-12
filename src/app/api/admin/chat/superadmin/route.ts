import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { SuperAdminChat } from "@/models/SuperAdminChat";
import { AuthUser } from "@/models/AuthUser";
import { Notification } from "@/models/Notification";
import { TenantUser } from "@/models/TenantUser";
import { SalonProfile } from "@/models/SalonProfile";
import mongoose from "mongoose";

// GET /api/admin/chat/superadmin — returns chat messages with superadmin
export async function GET(req: NextRequest) {
  const authResult: AdminAuthResult = await requireAdmin(req);
  if (!authResult.success) return authResult.response;
  const { decoded } = authResult;

  await connectToDB();
  const chat = await SuperAdminChat.findOne({ tenantId: decoded.tenantId }).lean();
  return NextResponse.json(chat ?? { messages: [], unreadBySuperAdmin: 0, unreadByOwner: 0 });
}

// POST /api/admin/chat/superadmin — send message to superadmin
export async function POST(req: NextRequest) {
  const authResult: AdminAuthResult = await requireAdmin(req);
  if (!authResult.success) return authResult.response;
  const { decoded } = authResult;

  await connectToDB();

  const body = await req.json();
  const { content, attachments = [] } = body as { content: string; attachments: Array<{ url: string; type: string; name: string; size: number }> };

  if (!content?.trim() && attachments.length === 0) {
    return NextResponse.json({ error: "Poruka ne može biti prazna" }, { status: 400 });
  }

  let chat = await SuperAdminChat.findOne({ tenantId: decoded.tenantId });
  if (!chat) {
    chat = new SuperAdminChat({
      tenantId: decoded.tenantId,
      ownerId: decoded.tenantUserId,
      messages: [],
      unreadBySuperAdmin: 0,
      unreadByOwner: 0,
    });
  }

  (chat.messages as Array<{ senderId: mongoose.Types.ObjectId | string; senderRole: string; message: string; attachments: typeof attachments; isDeleted: boolean; isRead: boolean; timestamp: Date }>).push({
    senderId: decoded.tenantUserId!,
    senderRole: "owner",
    message: content?.trim() ?? "",
    attachments,
    isDeleted: false,
    isRead: false,
    timestamp: new Date(),
  });

  chat.unreadBySuperAdmin += 1;
  chat.lastMessageAt = new Date();
  await chat.save();

  // Create notification for superadmin using their AuthUser._id as recipientProfileId
  try {
    const superadminEmail = process.env.SUPERADMIN_EMAIL;
    if (superadminEmail) {
      const superadminUser = (await AuthUser.findOne({ email: superadminEmail })
        .select("_id")
        .lean()) as { _id: mongoose.Types.ObjectId } | null;

      if (superadminUser) {
        const senderProfile = (await TenantUser.findById(decoded.tenantUserId)
          .select("name tenantId")
          .lean()) as { name?: string; tenantId?: mongoose.Types.ObjectId } | null;

        const salonName = senderProfile?.tenantId
          ? ((await SalonProfile.findOne({ tenantId: senderProfile.tenantId })
              .select("name")
              .lean()) as { name?: string } | null)?.name ?? "Salon"
          : "Salon";

        await Notification.create({
          recipientProfileId: superadminUser._id,
          tenantId: decoded.tenantId ?? new mongoose.Types.ObjectId(),
          type: "chat_message",
          title: `${salonName}`,
          message: content?.trim() ? content.trim().slice(0, 80) : "📎 Prilog",
          isRead: false,
          metadata: {
            sender: "admin",
            clientName: senderProfile?.name ?? "Admin",
            salonName,
          },
        });
      }
    }
  } catch { /* notification is non-critical */ }

  return NextResponse.json({ success: true });
}
