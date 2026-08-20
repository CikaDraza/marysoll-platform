import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { verifyToken } from "@/lib/auth/auth-server";
import {
  addPushSubscription,
  hasPushSubscription,
  resolvePushTarget,
  setPushSubscriptionOrigin,
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

    if (!decoded || !resolvePushTarget(decoded)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    const { subscription } = await req.json();
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Missing subscription" }, { status: 400 });
    }

    const isActive = await hasPushSubscription(decoded, subscription.endpoint);
    const origin = platformOrigin(req);

    if (!isActive && subscription.keys) {
      // Nije sačuvana (npr. re-subscribe na novom uređaju) — sačuvaj je.
      await addPushSubscription(decoded, {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        origin,
      });
    } else if (isActive) {
      // Postoji — popuni/osveži `origin` (zapisi stariji od tog polja).
      await setPushSubscriptionOrigin(decoded, subscription.endpoint, origin);
    }

    return NextResponse.json({
      success: true,
      isActive: isActive || !!subscription.keys,
    });
  } catch (error) {
    console.error("POST /api/notifications/check-subscription:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
