import "server-only";

// ─── Growth Studio: loyalty notifikacije ──────────────────────────────────────
// In-app (Notification model) + web push sa salon brandingom. Email samo za
// high-value događaje (Faza 2: voucher/tier/win-back email templati).
// Celebration-worthy notifikacije nose metadata.celebration=true i klijentov
// panel ih pušta kao "moment" pri sledećoj poseti.

import { Types } from "mongoose";
import {
  createNotification,
  getSalonBranding,
} from "@/lib/notificationService";
import { sendWebPushToUser, sendWebPushToMany } from "@/lib/webPush";
import { TenantUser } from "@/models/TenantUser";
import { connectToDB } from "@/lib/db/mongodb";
import type { INotification } from "@/types";

const CLIENT_PANEL_URL = "/panel?tab=Nagrade";
const ADMIN_APPOINTMENTS_URL = "/dashboard?tab=termini";

export interface LoyaltyNotificationParams {
  tenantId: Types.ObjectId | string;
  recipientProfileId: Types.ObjectId | string;
  type: INotification["type"];
  title: string;
  message: string;
  appointmentId?: Types.ObjectId | string;
  metadata?: Record<string, unknown>;
  /** true = klijent vidi celebration overlay pri sledećoj poseti panela */
  celebration?: boolean;
}

/** Nikad ne baca — loyalty notifikacija ne sme da sruši obradu događaja. */
export async function createLoyaltyNotification(
  params: LoyaltyNotificationParams,
): Promise<void> {
  try {
    const { icon, name: salonName } = await getSalonBranding(params.tenantId);

    await createNotification({
      recipientProfileId: String(params.recipientProfileId),
      tenantId: params.tenantId,
      type: params.type,
      title: params.title,
      message: params.message,
      appointmentId: params.appointmentId
        ? String(params.appointmentId)
        : undefined,
      metadata: {
        ...params.metadata,
        ...(params.celebration ? { celebration: true } : {}),
      },
    });

    await sendWebPushToUser(String(params.recipientProfileId), {
      title: salonName,
      body: params.message,
      icon,
      tag: `loyalty-${params.type}-${params.recipientProfileId}`,
      url: CLIENT_PANEL_URL,
    });
  } catch (err) {
    console.error("[loyalty] notification failed:", err);
  }
}

/** Prompt adminima: termin nije označen kao završen (dvostepeni auto-complete). */
export async function notifyAdminsCompletionPrompt(params: {
  tenantId: Types.ObjectId | string;
  appointmentId: Types.ObjectId | string;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
}): Promise<void> {
  try {
    await connectToDB();
    const admins = (await TenantUser.find({
      tenantId: params.tenantId,
      role: { $in: ["OWNER", "ADMIN"] },
    })
      .select("_id")
      .lean()) as { _id: Types.ObjectId }[];
    const adminIds = admins.map((a) => a._id.toString());
    if (adminIds.length === 0) return;

    const { icon, name: salonName } = await getSalonBranding(params.tenantId);
    const message = `Termin ${params.clientName} — ${params.serviceName} (${params.date} u ${params.time}) nije označen. Označite: Završen / No-show / Otkazan.`;

    for (const adminId of adminIds) {
      try {
        await createNotification({
          recipientProfileId: adminId,
          tenantId: params.tenantId,
          type: "loyalty_completion_prompt",
          title: "Neoznačen termin",
          message,
          appointmentId: String(params.appointmentId),
          metadata: {
            clientName: params.clientName,
            serviceName: params.serviceName,
          },
        });
      } catch (e) {
        console.error("[loyalty] completion prompt in-app failed:", e);
      }
    }

    await sendWebPushToMany(adminIds, {
      title: salonName,
      body: `⏳ ${message}`,
      icon,
      tag: `loyalty-completion-prompt-${params.appointmentId}`,
      url: ADMIN_APPOINTMENTS_URL,
    });
  } catch (err) {
    console.error("[loyalty] completion prompt failed:", err);
  }
}
