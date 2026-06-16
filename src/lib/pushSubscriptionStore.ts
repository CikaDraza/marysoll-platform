import "server-only";

// Jedinstveno mesto za čuvanje push pretplata — radi i za tenant korisnike
// (TenantUser) i za platformske korisnike / superadmin (AuthUser).

import type { Model } from "mongoose";
import { TenantUser } from "@/models/TenantUser";
import { AuthUser } from "@/models/AuthUser";
import type { DecodedToken } from "@/types/auth/types";

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

interface PushDoc {
  pushSubscriptions?: Array<{
    endpoint: string;
    keys: { p256dh: string; auth: string };
    createdAt?: Date;
  }>;
}

/**
 * Razrešava ciljani model + id za push pretplate na osnovu tokena.
 * - tenant korisnik → TenantUser (decoded.tenantUserId)
 * - superadmin/platforma → AuthUser (decoded.id)
 */
export function resolvePushTarget(
  decoded: DecodedToken,
): { model: Model<PushDoc>; id: string } | null {
  if (decoded.tenantUserId) {
    return { model: TenantUser as unknown as Model<PushDoc>, id: decoded.tenantUserId };
  }
  if (decoded.isSuperAdmin && decoded.id) {
    return { model: AuthUser as unknown as Model<PushDoc>, id: decoded.id };
  }
  return null;
}

export async function addPushSubscription(
  decoded: DecodedToken,
  sub: PushSubscriptionInput,
): Promise<boolean> {
  const target = resolvePushTarget(decoded);
  if (!target) return false;
  await target.model.findByIdAndUpdate(target.id, {
    $addToSet: {
      pushSubscriptions: {
        endpoint: sub.endpoint,
        keys: sub.keys,
        createdAt: new Date(),
      },
    },
  });
  return true;
}

export async function removePushSubscription(
  decoded: DecodedToken,
  endpoint: string,
): Promise<boolean> {
  const target = resolvePushTarget(decoded);
  if (!target) return false;
  await target.model.findByIdAndUpdate(target.id, {
    $pull: { pushSubscriptions: { endpoint } },
  });
  return true;
}

export async function hasPushSubscription(
  decoded: DecodedToken,
  endpoint: string,
): Promise<boolean> {
  const target = resolvePushTarget(decoded);
  if (!target) return false;
  const doc = (await target.model
    .findById(target.id)
    .select("pushSubscriptions")
    .lean()) as PushDoc | null;
  return doc?.pushSubscriptions?.some((s) => s.endpoint === endpoint) ?? false;
}
