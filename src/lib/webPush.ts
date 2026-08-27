import "server-only";

import webpush from "web-push";
import { getVapidKeys } from "@/lib/vapid";
import { TenantUser } from "@/models/TenantUser";
import { AuthUser } from "@/models/AuthUser";
import { SalonProfile } from "@/models/SalonProfile";
import { Types } from "mongoose";
import {
  currentEnvironmentKey,
  environmentKeyOfOrigin,
} from "@/lib/platform/host-context";
import type { UserNotificationSettings } from "@/types";
import {
  DEFAULT_NOTIFICATION_ICON,
  resolveNotificationIcon,
  usableRasterLogo,
} from "@/lib/branding/rasterLogo";

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
  origin?: string | null;
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
 * Pretplate koje pripadaju OVOM okruženju.
 *
 * Push `url` je root-relativan (`/dashboard?tab=termini`) i service worker ga
 * razrešava na originu na kome je REGISTROVAN — ne na onom sa koga je push
 * poslat. Preview deployi dele bazu sa produkcijom, pa je pretplata napravljena
 * na `…vercel.app` u istom dokumentu: produkcijski push bi tamo otvorio
 * `…vercel.app/dashboard`, gde nema sesije → redirect na goli `/login`.
 *
 * Pretplate BEZ `origin`-a starije su od tog polja i namerno prolaze — inače bi
 * svi postojeći korisnici ostali bez push-a do sledećeg re-subscribe-a.
 * `check-subscription` ih popunjava pri sledećoj poseti.
 */
function forThisEnvironment(
  subscriptions: StoredSubscription[],
): StoredSubscription[] {
  const env = currentEnvironmentKey();
  return subscriptions.filter(
    (sub) => !sub.origin || environmentKeyOfOrigin(sub.origin) === env,
  );
}

/**
 * Core sender — šalje payload na sve prosleđene pretplate i vraća mrtve endpoint-e
 * (HTTP 410/404) koje pozivalac treba da ukloni.
 */
async function sendToSubscriptions(
  allSubscriptions: StoredSubscription[],
  payload: PushPayload,
): Promise<string[]> {
  initVapid();
  const subscriptions = forThisEnvironment(allSubscriptions);
  if (!vapidInitialized || !subscriptions.length) return [];

  // Poslednja zaštita pred izlazak ka browseru: SVG notification ikonice se ne
  // renderuju pouzdano, a payload nikada ne sme ostati bez Marysoll fallbacka.
  const message = JSON.stringify({
    ...payload,
    icon: resolveNotificationIcon(payload.icon),
  });
  const deadEndpoints: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          message,
        );
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
      .select("pushSubscriptions notificationSettings tenantId")
      .lean()) as {
      pushSubscriptions?: StoredSubscription[];
      notificationSettings?: Partial<UserNotificationSettings>;
      tenantId?: Types.ObjectId;
    } | null;

    if (!user?.pushSubscriptions?.length) return;

    const settings = user.notificationSettings;
    // Master push toggle (default uključeno)
    if (settings?.pushNotifications === false) return;
    // Dodatni per-feature uslovi (svi moraju biti true / nedefinisani)
    if (opts?.requireSettings?.some((key) => settings?.[key] === false)) return;

    // Ako pozivalac nije prosledio raster ikonicu, centralno pročitaj namenski
    // `notificationLogo` iz Dashboard > Profil. Običan site logo se ne koristi
    // jer sme biti SVG. Bez podešenog raster loga ostaje Marysoll fallback.
    let resolvedPayload = payload;
    if (!usableRasterLogo(payload.icon) && user.tenantId) {
      const profile = (await SalonProfile.findOne({ tenantId: user.tenantId })
        .select("notificationLogo")
        .lean()) as { notificationLogo?: string | null } | null;
      if (usableRasterLogo(profile?.notificationLogo)) {
        resolvedPayload = { ...payload, icon: profile.notificationLogo };
      }
    }

    const dead = await sendToSubscriptions(
      user.pushSubscriptions,
      resolvedPayload,
    );
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

    // AuthUser je platformski/superadmin kontekst: tenant logo iz payload-a ne
    // sme da promeni platformsku Marysoll identifikaciju.
    const dead = await sendToSubscriptions(user.pushSubscriptions, {
      ...payload,
      icon: DEFAULT_NOTIFICATION_ICON,
    });
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
