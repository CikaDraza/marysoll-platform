// app/api/notifications/subscribe/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { getSalonBranding } from "@/lib/notificationService";
import { DEFAULT_NOTIFICATION_ICON } from "@/lib/branding/rasterLogo";
import { verifyToken } from "@/lib/auth/auth-server";
import webpush from "web-push";
import { getVapidKeys } from "@/lib/vapid";
import { Types } from "mongoose";
import {
  addPushSubscription,
  resolvePushTarget,
} from "@/lib/pushSubscriptionStore";
import { platformOrigin } from "@/lib/platform/host-context";

export async function POST(req: Request) {
  try {
    await connectToDB();

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    // Tenant korisnik ILI superadmin (platforma)
    const target = resolvePushTarget(decoded);
    if (!target) {
      return NextResponse.json({ error: "No push target" }, { status: 403 });
    }

    const { subscription } = await req.json();
    if (!subscription?.endpoint || !subscription?.keys) {
      return NextResponse.json({ error: "Missing subscription" }, { status: 400 });
    }

    // Ikona = notificationLogo salona (raster) → Marysoll default. Tenant `logo`
    // se NE koristi jer može biti SVG koji web push renderuje kao uzvičnik.
    let notificationIcon: string = DEFAULT_NOTIFICATION_ICON;
    if (decoded.tenantUserId) {
      try {
        const tenantUser = (await TenantUser.findById(decoded.tenantUserId)
          .select("tenantId")
          .lean()) as { tenantId?: Types.ObjectId } | null;
        if (tenantUser?.tenantId) {
          notificationIcon = (await getSalonBranding(tenantUser.tenantId)).icon;
        }
      } catch {
        /* fall through */
      }
    }

    // Sačuvaj subscription (TenantUser ili AuthUser, preko helpera).
    // `origin` = odakle zahtev STVARNO dolazi — service worker će root-relativni
    // push `url` razrešiti baš tamo, pa se po njemu kasnije filtrira slanje.
    await addPushSubscription(decoded, {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      origin: platformOrigin(req),
    });

    // Test push notifikacija za potvrdu
    try {
      const vapidKeys = getVapidKeys();
      webpush.setVapidDetails(
        `mailto:${vapidKeys.email}`,
        vapidKeys.publicKey,
        vapidKeys.privateKey,
      );
      await webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: "Push notifikacije su aktivirane!",
          body: "Sada ćete primati obaveštenja čak i kada niste na sajtu.",
          icon: notificationIcon,
          tag: "subscription-success",
          data: { url: "/", timestamp: Date.now() },
        }),
      );
    } catch (pushError) {
      console.warn("Test push failed (might be expected):", pushError);
    }

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed to push notifications",
    });
  } catch (error) {
    console.error("Error in subscribe endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
