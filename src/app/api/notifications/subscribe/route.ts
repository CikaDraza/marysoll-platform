// app/api/notifications/subscribe/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { SalonProfile } from "@/models/SalonProfile";
import { verifyToken } from "@/lib/auth/auth-server";
import webpush from "web-push";
import { getVapidKeys } from "@/lib/vapid";
import { Types } from "mongoose";

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

    if (!decoded.tenantUserId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 403 });
    }

    const { subscription } = await req.json();

    // Resolve salon logo for the notification icon
    let notificationIcon = "/marysoll_elegant_logo.png";
    try {
      const tenantUser = (await TenantUser.findById(decoded.tenantUserId)
        .select("tenantId")
        .lean()) as { tenantId?: Types.ObjectId } | null;
      if (tenantUser?.tenantId) {
        const profile = (await SalonProfile.findOne({
          tenantId: tenantUser.tenantId,
        })
          .select("logo")
          .lean()) as { logo?: string } | null;
        if (profile?.logo) notificationIcon = profile.logo;
      }
    } catch {
      /* fall through */
    }

    // Konfiguriši web-push sa VAPID ključevima
    const vapidKeys = getVapidKeys();
    webpush.setVapidDetails(
      `mailto:${vapidKeys.email}`,
      vapidKeys.publicKey,
      vapidKeys.privateKey,
    );

    // Sačuvaj ili ažuriraj subscription
    await TenantUser.findByIdAndUpdate(
      decoded.tenantUserId,
      {
        $addToSet: {
          pushSubscriptions: {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
            createdAt: new Date(),
          },
        },
      },
      { new: true },
    );

    // Test push notifikacija za potvrdu
    try {
      await webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: "Push notifikacije su aktivirane!",
          body: "Sada ćete primati obaveštenja čak i kada niste na sajtu.",
          icon: notificationIcon,
          tag: "subscription-success",
          data: {
            url: "/",
            timestamp: Date.now(),
          },
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
