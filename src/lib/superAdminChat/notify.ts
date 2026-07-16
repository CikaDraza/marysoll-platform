import "server-only";

// ─── SuperAdmin ↔ Owner chat: obaveštenja (zvonce + push + email) ──────────────
// Simetrično u oba smera:
//   • Zvonce (Notification, type "chat_message") — vidi se u dashboardu i na iPhone-u.
//   • Web push — iPhone browser/PWA nema push subscription (iOS guard), pa je za
//     njih no-op; dobijaju samo zvonce + email. Nikad ne pravimo push subscription
//     ovde (server šalje samo na postojeće pretplate) → ne može da sruši dashboard.
//   • Email — throttle-ovan (1 po prozoru po smeru) da ne spamuje na svaku poruku;
//     prozor se resetuje kada primalac pročita chat.
// Sve je wrap-ovano u try/catch — obaveštenje ne sme da sruši slanje poruke.

import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { SuperAdminChat } from "@/models/SuperAdminChat";
import { Notification } from "@/models/Notification";
import { TenantUser } from "@/models/TenantUser";
import { AuthUser } from "@/models/AuthUser";
import { getSalonBranding } from "@/lib/notificationService";
import { sendWebPushToUser, sendWebPushToAuthUser } from "@/lib/webPush";
import { sendSuperAdminChatNotification } from "@/lib/email/email";

const EMAIL_THROTTLE_MS = 15 * 60 * 1000; // 15 min
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? null;

type ThrottleField = "superAdminEmailThrottleAt" | "ownerEmailThrottleAt";

function preview(content: string, hasAttachment: boolean): string {
  const trimmed = content?.trim();
  if (trimmed) return trimmed.slice(0, 80);
  return hasAttachment ? "📎 Prilog" : "";
}

function deliverableEmails(emails: (string | undefined | null)[]): string[] {
  return emails.filter(
    (e): e is string =>
      !!e && e.includes("@") && !e.trim().toLowerCase().endsWith("@noemail.guest"),
  );
}

/**
 * Atomic throttle claim — postavi timestamp SAMO ako je prozor istekao (ili nije
 * postavljen). Vraća true ako je slot "osvojen" i email treba poslati. Sprečava
 * duple/burst emailove čak i pri konkurentnim porukama.
 */
async function claimEmailSlot(
  tenantId: string | Types.ObjectId,
  field: ThrottleField,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - EMAIL_THROTTLE_MS);
  const claimed = await SuperAdminChat.findOneAndUpdate(
    {
      tenantId,
      $or: [
        { [field]: null },
        { [field]: { $exists: false } },
        { [field]: { $lte: cutoff } },
      ],
    },
    { $set: { [field]: new Date() } },
  ).lean();
  return !!claimed;
}

/**
 * Owner (salon) je poslao poruku → obavesti sve superadmine.
 */
export async function notifySuperAdminsOfChatMessage(params: {
  tenantId: string | Types.ObjectId;
  senderTenantUserId?: string | Types.ObjectId | null;
  content: string;
  hasAttachment: boolean;
}): Promise<void> {
  try {
    await connectToDB();
    const tenantIdStr = params.tenantId.toString();
    const body = preview(params.content, params.hasAttachment);

    const { icon, name: salonName } = await getSalonBranding(tenantIdStr);

    let senderName = salonName || "Salon";
    if (params.senderTenantUserId) {
      const sender = (await TenantUser.findById(params.senderTenantUserId)
        .select("name")
        .lean()) as { name?: string } | null;
      if (sender?.name) senderName = sender.name;
    }

    const superadmins = (await AuthUser.find({ platformRole: "SUPER_ADMIN" })
      .select("_id email")
      .lean()) as { _id: Types.ObjectId; email?: string }[];

    if (!superadmins.length) return;

    // 1) Zvonce — po jedan za svakog superadmina (recipientProfileId = AuthUser._id).
    await Promise.allSettled(
      superadmins.map((sa) =>
        Notification.create({
          recipientProfileId: sa._id,
          tenantId: params.tenantId,
          type: "chat_message",
          title: salonName,
          message: body || "📎 Prilog",
          isRead: false,
          metadata: { sender: "admin", clientName: senderName, salonName },
        }),
      ),
    );

    // 2) Push — svim superadminima.
    await Promise.allSettled(
      superadmins.map((sa) =>
        sendWebPushToAuthUser(sa._id, {
          title: salonName,
          body: `💬 ${senderName}: ${body || "📎 Prilog"}`,
          icon,
          tag: `superadmin-chat-${tenantIdStr}`,
          url: "/superadmin",
        }),
      ),
    );

    // 3) Email — throttle-ovan (jedan po prozoru bez obzira na broj superadmina).
    const emails = deliverableEmails(superadmins.map((s) => s.email));
    if (
      emails.length &&
      (await claimEmailSlot(params.tenantId, "superAdminEmailThrottleAt"))
    ) {
      await Promise.allSettled(
        emails.map((to) =>
          sendSuperAdminChatNotification(to, {
            salonName: salonName || "Salon",
            senderLabel: senderName,
            message: params.content ?? "",
            hasAttachment: params.hasAttachment,
            fromSuperAdmin: false,
            url: APP_URL ? `${APP_URL}/superadmin` : null,
          }),
        ),
      );
    }
  } catch (err) {
    console.error("[superAdminChat] notifySuperAdmins failed:", err);
  }
}

/**
 * Superadmin (Marysoll podrška) je poslao poruku → obavesti vlasnika/admine salona.
 */
export async function notifyOwnersOfChatMessage(params: {
  tenantId: string | Types.ObjectId;
  content: string;
  hasAttachment: boolean;
}): Promise<void> {
  try {
    await connectToDB();
    const tenantIdStr = params.tenantId.toString();
    const body = preview(params.content, params.hasAttachment);
    const { icon } = await getSalonBranding(tenantIdStr);

    const owners = (await TenantUser.find({
      tenantId: params.tenantId,
      role: { $in: ["OWNER", "ADMIN"] },
    })
      .select("_id email")
      .lean()) as { _id: Types.ObjectId; email?: string }[];

    if (!owners.length) return;

    // 1) Zvonce — recipientProfileId = TenantUser._id (owner-ov bell čita po tome).
    await Promise.allSettled(
      owners.map((o) =>
        Notification.create({
          recipientProfileId: o._id,
          tenantId: params.tenantId,
          type: "chat_message",
          title: "Marysoll podrška",
          message: body || "📎 Prilog",
          isRead: false,
          metadata: { sender: "admin", clientName: "Marysoll podrška" },
        }),
      ),
    );

    // 2) Push — poštuje pushNotifications setting; iPhone bez subscription = no-op.
    await Promise.allSettled(
      owners.map((o) =>
        sendWebPushToUser(o._id.toString(), {
          title: "Marysoll",
          body: `💬 Marysoll podrška: ${body || "📎 Prilog"}`,
          icon,
          tag: `superadmin-chat-${tenantIdStr}`,
          url: "/admin/chat/superadmin",
        }),
      ),
    );

    // 3) Email — throttle-ovan.
    const emails = deliverableEmails(owners.map((o) => o.email));
    if (
      emails.length &&
      (await claimEmailSlot(params.tenantId, "ownerEmailThrottleAt"))
    ) {
      await Promise.allSettled(
        emails.map((to) =>
          sendSuperAdminChatNotification(to, {
            salonName: "",
            senderLabel: "Marysoll podrška",
            message: params.content ?? "",
            hasAttachment: params.hasAttachment,
            fromSuperAdmin: true,
            url: APP_URL,
          }),
        ),
      );
    }
  } catch (err) {
    console.error("[superAdminChat] notifyOwners failed:", err);
  }
}
