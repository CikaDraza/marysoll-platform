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
  /**
   * Origin na kome je pretplata nastala (`platformOrigin(req)`). Bez njega push
   * poslat iz produkcije može da probudi service worker registrovan na preview
   * deployu, gde root-relativni `url` vodi na `…vercel.app/dashboard` → /login.
   */
  origin?: string | null;
}

interface PushDoc {
  pushSubscriptions?: Array<{
    endpoint: string;
    keys: { p256dh: string; auth: string };
    origin?: string | null;
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

/**
 * Upisuje (ili osvežava) pretplatu — zamenjuje postojeći zapis sa istim
 * endpoint-om. `$addToSet` to ne može: endpoint je jedinstven po (browser,
 * origin, VAPID ključ), pa bi stari zapis ostao bez `origin`-a zauvek.
 *
 * Ide kao aggregation-pipeline update (filter + concat) da bi zamena bila
 * ATOMIČNA — `$pull` pa `$push` ostavlja prozor u kome korisnik nema pretplatu.
 */
export async function addPushSubscription(
  decoded: DecodedToken,
  sub: PushSubscriptionInput,
): Promise<boolean> {
  const target = resolvePushTarget(decoded);
  if (!target) return false;
  await target.model.updateOne({ _id: target.id }, [
    {
      $set: {
        pushSubscriptions: {
          $concatArrays: [
            {
              $filter: {
                input: { $ifNull: ["$pushSubscriptions", []] },
                as: "sub",
                cond: { $ne: ["$$sub.endpoint", sub.endpoint] },
              },
            },
            [
              {
                endpoint: sub.endpoint,
                keys: sub.keys,
                origin: sub.origin ?? null,
                createdAt: new Date(),
              },
            ],
          ],
        },
      },
    },
  ]);
  return true;
}

/**
 * Upisuje `origin` na pretplatu koja je već sačuvana (zapisi napravljeni pre
 * uvođenja polja). Zove se sa `/notifications/check-subscription`, koji klijent
 * gađa pri svakom učitavanju — tako se stari zapisi popune sami, sa origin-a sa
 * koga stvarno dolaze.
 */
export async function setPushSubscriptionOrigin(
  decoded: DecodedToken,
  endpoint: string,
  origin: string,
): Promise<boolean> {
  const target = resolvePushTarget(decoded);
  if (!target || !origin) return false;
  await target.model.updateOne(
    { _id: target.id },
    { $set: { "pushSubscriptions.$[sub].origin": origin } },
    { arrayFilters: [{ "sub.endpoint": endpoint, "sub.origin": { $ne: origin } }] },
  );
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
