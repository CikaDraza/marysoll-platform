import "server-only";

import webpush from "web-push";
import { getVapidKeys } from "@/lib/vapid";
import { TenantUser } from "@/models/TenantUser";
import { AuthUser } from "@/models/AuthUser";
import { Types } from "mongoose";
import type { UserNotificationSettings } from "@/types";

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
}

type StoredSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

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

/**
 * Core sender — šalje payload na sve prosleđene pretplate i vraća mrtve endpoint-e
 * (HTTP 410/404) koje pozivalac treba da ukloni.
 */
async function sendToSubscriptions(
  subscriptions: StoredSubscription[],
  payload: PushPayload,
): Promise<string[]> {
  initVapid();
  if (!vapidInitialized || !subscriptions.length) return [];

  const message = JSON.stringify(payload);
  const deadEndpoints: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
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

  return deadEndpoints;
}

/**
 * Šalje push tenant korisniku (TenantUser).
 * Poštuje master `pushNotifications` podešavanje (default uključeno), a opciono
 * i dodatne ključeve (npr. `appointmentReminder`) preko `opts.requireSettings`.
 */
export async function sendWebPushToUser(
  tenantUserId: string | Types.ObjectId,
  payload: PushPayload,
  opts?: { requireSettings?: (keyof UserNotificationSettings)[] },
): Promise<void> {
  try {
    const user = (await TenantUser.findById(tenantUserId)
      .select("pushSubscriptions notificationSettings")
      .lean()) as {
      pushSubscriptions?: StoredSubscription[];
      notificationSettings?: Partial<UserNotificationSettings>;
    } | null;

    if (!user?.pushSubscriptions?.length) return;

    const settings = user.notificationSettings;
    // Master push toggle (default uključeno)
    if (settings?.pushNotifications === false) return;
    // Dodatni per-feature uslovi (svi moraju biti true / nedefinisani)
    if (opts?.requireSettings?.some((key) => settings?.[key] === false)) return;

    const dead = await sendToSubscriptions(user.pushSubscriptions, payload);
    if (dead.length) {
      await TenantUser.findByIdAndUpdate(tenantUserId, {
        $pull: { pushSubscriptions: { endpoint: { $in: dead } } },
      });
    }
  } catch (err) {
    console.error("sendWebPushToUser error:", err);
  }
}

export async function sendWebPushToMany(
  tenantUserIds: string[],
  payload: PushPayload,
  opts?: { requireSettings?: (keyof UserNotificationSettings)[] },
): Promise<void> {
  await Promise.allSettled(
    tenantUserIds.map((id) => sendWebPushToUser(id, payload, opts)),
  );
}

/**
 * Šalje push platformskom korisniku (AuthUser — npr. superadmin).
 */
export async function sendWebPushToAuthUser(
  authUserId: string | Types.ObjectId,
  payload: PushPayload,
): Promise<void> {
  try {
    const user = (await AuthUser.findById(authUserId)
      .select("pushSubscriptions")
      .lean()) as { pushSubscriptions?: StoredSubscription[] } | null;

    if (!user?.pushSubscriptions?.length) return;

    const dead = await sendToSubscriptions(user.pushSubscriptions, payload);
    if (dead.length) {
      await AuthUser.findByIdAndUpdate(authUserId, {
        $pull: { pushSubscriptions: { endpoint: { $in: dead } } },
      });
    }
  } catch (err) {
    console.error("sendWebPushToAuthUser error:", err);
  }
}

/**
 * Šalje push svim superadminima (AuthUser sa platformRole "SUPER_ADMIN").
 */
export async function sendWebPushToSuperAdmins(
  payload: PushPayload,
): Promise<void> {
  try {
    const admins = (await AuthUser.find({ platformRole: "SUPER_ADMIN" })
      .select("_id")
      .lean()) as { _id: Types.ObjectId }[];

    await Promise.allSettled(
      admins.map((a) => sendWebPushToAuthUser(a._id, payload)),
    );
  } catch (err) {
    console.error("sendWebPushToSuperAdmins error:", err);
  }
}
