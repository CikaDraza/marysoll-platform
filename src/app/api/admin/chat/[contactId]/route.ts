import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { SalonInternalChat } from "@/models/SalonInternalChat";
import { SalonProfile } from "@/models/SalonProfile";
import { TenantUser } from "@/models/TenantUser";
import { Notification } from "@/models/Notification";
import { sendWebPushToUser } from "@/lib/webPush";
import mongoose from "mongoose";

function participantKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// GET /api/admin/chat/[contactId] — get messages with a contact
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contactId: string }> },
) {
  const { contactId } = await params;
  const authResult: AdminAuthResult = await requireAdmin(req);
  if (!authResult.success) return authResult.response;
  const { decoded } = authResult;

  await connectToDB();

  const myId = decoded.tenantUserId!;
  const [p0, p1] = participantKey(myId, contactId);

  const chat = await SalonInternalChat.findOne({
    tenantId: decoded.tenantId,
    "participants.0": new mongoose.Types.ObjectId(p0),
    "participants.1": new mongoose.Types.ObjectId(p1),
  }).lean();

  return NextResponse.json(chat ?? { messages: [] });
}

// POST /api/admin/chat/[contactId] — send message to a contact
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contactId: string }> },
) {
  const { contactId } = await params;
  const authResult: AdminAuthResult = await requireAdmin(req);
  if (!authResult.success) return authResult.response;
  const { decoded } = authResult;

  await connectToDB();

  const body = await req.json();
  const { content, attachments = [] } = body as {
    content: string;
    attachments: Array<{ url: string; type: string; name: string; size: number }>;
  };

  if (!content?.trim() && attachments.length === 0) {
    return NextResponse.json({ error: "Poruka ne može biti prazna" }, { status: 400 });
  }

  const me = await TenantUser.findById(decoded.tenantUserId)
    .select("name role permissions tenantId")
    .lean<{ name: string; role: string; permissions: Record<string, unknown> | null; tenantId: mongoose.Types.ObjectId }>();

  if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Verify contact exists in the same tenant and has chat access
  const contact = await TenantUser.findOne({
    _id: contactId,
    tenantId: decoded.tenantId,
    role: { $in: ["OWNER", "ADMIN", "STAFF"] },
  })
    .select("_id name role permissions")
    .lean<{ _id: mongoose.Types.ObjectId; name: string; role: string; permissions: Record<string, unknown> | null }>();

  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  if (
    contact.role === "STAFF" &&
    (contact.permissions as Record<string, unknown> | null)?.chat !== true
  ) {
    return NextResponse.json({ error: "Contact does not have chat access" }, { status: 403 });
  }

  const myId = decoded.tenantUserId!;
  const [p0, p1] = participantKey(myId, contactId);

  let chat = await SalonInternalChat.findOne({
    tenantId: decoded.tenantId,
    "participants.0": new mongoose.Types.ObjectId(p0),
    "participants.1": new mongoose.Types.ObjectId(p1),
  });

  if (!chat) {
    chat = new SalonInternalChat({
      tenantId: decoded.tenantId,
      participants: [new mongoose.Types.ObjectId(p0), new mongoose.Types.ObjectId(p1)],
      messages: [],
      unreadCount: {},
      lastMessageAt: new Date(),
    });
  }

  const newMsg = {
    senderId: new mongoose.Types.ObjectId(myId),
    senderName: me.name,
    senderRole: me.role,
    content: content?.trim() ?? "",
    attachments,
    isDeleted: false,
    timestamp: new Date(),
  };

  (chat.messages as typeof chat.messages).push(newMsg as Parameters<typeof chat.messages.push>[0]);
  chat.lastMessageAt = new Date();

  // Increment unread for the recipient
  const currentUnread = chat.unreadCount.get(contactId) ?? 0;
  chat.unreadCount.set(contactId, currentUnread + 1);
  chat.markModified("unreadCount");

  await chat.save();

  // Create notification for the recipient
  await Notification.create({
    tenantId: decoded.tenantId,
    recipientProfileId: contactId,
    type: "chat_message",
    title: `Nova poruka od ${me.name}`,
    message: content?.trim() ? content.trim().slice(0, 80) : "📎 Prilog",
    isRead: false,
    metadata: {
      sender: "admin",
      clientName: me.name,
    },
  });

  // Web push to recipient
  try {
    const profile = (await SalonProfile.findOne({ tenantId: decoded.tenantId })
      .select("logo name")
      .lean()) as { logo?: string; name?: string } | null;
    await sendWebPushToUser(contactId, {
      title: profile?.name || "Salon",
      body: `💬 ${me.name}: ${content?.trim() ? content.trim().slice(0, 80) : "📎 Prilog"}`,
      icon: profile?.logo || "/notification-icon.png",
      tag: `chat-internal-${decoded.tenantUserId}`,
      url: "/admin/chat",
    });
  } catch { /* push is non-critical */ }

  return NextResponse.json({ success: true });
}
