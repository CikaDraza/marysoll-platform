// src/app/api/paddle/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  handlePaddleWebhook,
  paddleEventSubjectRef,
  verifyPaddleSignature,
  getPaddleWebhookSecret,
} from "@/lib/paddle";
import {
  isSupersededWebhookEvent,
  markWebhookFailed,
  markWebhookProcessed,
  markWebhookSkipped,
  recordWebhookEvent,
} from "@/lib/webhooks/eventStore";

/**
 * Paddle webhook — prijem pre obrade.
 *
 * Redosled je ceo smisao rute:
 *
 *   potpis → upis kao `received` → obrada → `processed` / `skipped` / `failed`
 *
 * Zašto: Paddle ponavlja isporuku na svaki non-2xx. Bez dedupa je ponovljen
 * `subscription.canceled` ponovo obarao tenanta na besplatan plan — salon koji
 * plaća gubio bi plaćene funkcije zbog provajderovog retry-ja.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("paddle-signature");

  const verified = verifyPaddleSignature({
    rawBody,
    signature,
    secret: getPaddleWebhookSecret(),
  });

  if (!verified.valid) {
    // `stale` je namerno isti status kao neispravan potpis: pozivaocu se ne
    // odaje da li je payload bio validan, samo starost odbijena.
    console.warn(`[PADDLE_WEBHOOK] potpis odbijen: ${verified.reason}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: {
    event_id?: string;
    event_type?: string;
    occurred_at?: string;
    data?: { id?: string } | null;
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!event.event_id || !event.event_type) {
    return NextResponse.json({ error: "Missing event fields" }, { status: 400 });
  }

  // Upis PRE obrade. Pad usred obrade tako ostavlja trag koji se može ponoviti,
  // umesto događaja koji je nestao.
  let recorded;
  try {
    recorded = await recordWebhookEvent({
      provider: "paddle",
      providerEventId: event.event_id,
      eventType: event.event_type,
      subjectRef: paddleEventSubjectRef(event),
      occurredAt: event.occurred_at ? new Date(event.occurred_at) : new Date(),
      signatureTs: verified.ts,
      payload: event,
    });
  } catch (error) {
    console.error("[PADDLE_WEBHOOK] upis događaja nije uspeo:", error);
    // 500 → Paddle ponavlja. Bezbedno je: unique ključ hvata duplikat.
    return NextResponse.json({ error: "Webhook store failed" }, { status: 500 });
  }

  // Već uspešno obrađen ili namerno preskočen → ponovljena isporuka je no-op.
  if (!recorded.shouldProcess) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Prestizanje: zakasneo događaj ne sme da pregazi noviji koji je već obrađen.
  // Dedup ovo ne pokriva — reč je o dva RAZLIČITA događaja.
  const superseded = await isSupersededWebhookEvent({
    provider: "paddle",
    subjectRef: paddleEventSubjectRef(event),
    occurredAt: event.occurred_at ? new Date(event.occurred_at) : new Date(),
    eventId: recorded.eventId,
  });
  if (superseded) {
    await markWebhookSkipped(recorded.eventId, "prestignut novijim događajem");
    return NextResponse.json({ received: true, superseded: true });
  }

  try {
    const outcome = await handlePaddleWebhook(
      event as Parameters<typeof handlePaddleWebhook>[0],
    );
    if (outcome.kind === "skipped") {
      await markWebhookSkipped(recorded.eventId, outcome.reason);
    } else {
      await markWebhookProcessed(recorded.eventId, outcome.tenantId);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[PADDLE_WEBHOOK] error:", error);
    await markWebhookFailed(recorded.eventId, error).catch((e) =>
      console.error("[PADDLE_WEBHOOK] označavanje neuspeha nije uspelo:", e),
    );
    // 500 → Paddle ponavlja, a `failed` zapis dozvoljava ponovnu obradu.
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
