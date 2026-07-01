// app/api/notifications/subscribe/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { SalonProfile } from "@/models/SalonProfile";
import { verifyToken } from "@/lib/auth/auth-server";
import webpush from "web-push";
import { getVapidKeys } from "@/lib/vapid";
import { Types } from "mongoose";
import {
  addPushSubscription,
  resolvePushTarget,
} from "@/lib/pushSubscriptionStore";

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

    // Ikona za notifikaciju: salon logo (tenant) ili platformski logo (superadmin)
    let notificationIcon = "/logo-marysoll.png";
    if (decoded.tenantUserId) {
      try {
        const tenantUser = (await TenantUser.findById(decoded.tenantUserId)
          .select("tenantId")
          .lean()) as { tenantId?: Types.ObjectId } | null;
        if (tenantUser?.tenantId) {
          const profile = (await SalonProfile.findOne({
            tenantId: tenantUser.tenantId,
          })
            .select("logo notificationLogo")
            .lean()) as { logo?: string; notificationLogo?: string } | null;
          // notificationLogo → logo sajta → platformski default.
          if (profile?.notificationLogo)
            notificationIcon = profile.notificationLogo;
          else if (profile?.logo) notificationIcon = profile.logo;
          else notificationIcon = "/marysoll_elegant_logo.png";
        }
      } catch {
        /* fall through */
      }
    }

    // Sačuvaj subscription (TenantUser ili AuthUser, preko helpera)
    await addPushSubscription(decoded, {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
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
