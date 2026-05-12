import "server-only";

import webpush from "web-push";
import { getVapidKeys } from "@/lib/vapid";
import { TenantUser } from "@/models/TenantUser";
import { Types } from "mongoose";

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
}

let vapidInitialized = false;

function initVapid() {
  if (vapidInitialized) return;
  try {
    const { publicKey, privateKey, email } = getVapidKeys();
    webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
    vapidInitialized = true;
  } catch {
    // VAPID keys not configured — push silently skipped
  }
}

export async function sendWebPushToUser(
  tenantUserId: string | Types.ObjectId,
  payload: PushPayload,
): Promise<void> {
  try {
    initVapid();
    if (!vapidInitialized) return;

    const user = (await TenantUser.findById(tenantUserId)
      .select("pushSubscriptions")
      .lean()) as {
      pushSubscriptions?: {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      }[];
    } | null;

    if (!user?.pushSubscriptions?.length) return;

    const message = JSON.stringify(payload);
    const deadEndpoints: string[] = [];

    await Promise.allSettled(
      user.pushSubscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub, message);
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 410 || status === 404) {
            deadEndpoints.push(sub.endpoint);
          } else {
            console.error("Web push send error:", err);
          }
        }
      }),
    );

    if (deadEndpoints.length) {
      await TenantUser.findByIdAndUpdate(tenantUserId, {
        $pull: { pushSubscriptions: { endpoint: { $in: deadEndpoints } } },
      });
    }
  } catch (err) {
    console.error("sendWebPushToUser error:", err);
  }
}

export async function sendWebPushToMany(
  tenantUserIds: string[],
  payload: PushPayload,
): Promise<void> {
  await Promise.allSettled(
    tenantUserIds.map((id) => sendWebPushToUser(id, payload)),
  );
}
