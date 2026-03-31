// app/api/notifications/subscribe/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import { verifyToken } from "@/lib/auth/auth-server";
import webpush from "web-push";
import { getVapidKeys } from "@/lib/vapid";

export async function POST(req: Request) {
  try {
    await connectToDB();

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const user = verifyToken(token);

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    const { subscription, userId } = await req.json();

    if (user.id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Konfiguriši web-push sa VAPID ključevima
    const vapidKeys = getVapidKeys();
    webpush.setVapidDetails(
      `mailto:${vapidKeys.email}`,
      vapidKeys.publicKey,
      vapidKeys.privateKey,
    );

    // Sačuvaj ili ažuriraj subscription
    await User.findByIdAndUpdate(
      userId,
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
          icon: "/notification-icon.png",
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
