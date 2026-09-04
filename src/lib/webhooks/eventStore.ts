import "server-only";

/**
 * Prijem dolaznih webhook događaja — zajednički za sve provajdere.
 *
 * Redosled je ceo smisao ovog modula:
 *
 *   upiši kao `received`  →  obradi  →  označi `processed`
 *
 * Nikad obrnuto. Zapis koji tvrdi da je obrađen pre nego što obrada završi je
 * tačno bug #4 iz T1-4 (`loyaltyProcessed.completed` je značilo „počeli smo",
 * ne „gotovo je"), samo na mestu gde posledica ima cenu u novcu.
 */

import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { WebhookEvent } from "@/models/WebhookEvent";

export type WebhookProvider = "paddle";

export interface RecordWebhookEventInput {
  provider: WebhookProvider;
  providerEventId: string;
  eventType: string;
  occurredAt: Date;
  subjectRef?: string | null;
  signatureTs?: number | null;
  payload?: unknown;
}

export interface RecordedWebhookEvent {
  eventId: Types.ObjectId;
  /** Već smo videli ovaj `providerEventId`. */
  duplicate: boolean;
  /**
   * Sme li se obrađivati sada.
   *
   * `false` za već uspešno obrađen ili namerno preskočen događaj — ponovljena
   * isporuka tada je no-op. `true` i za duplikat koji je ostao `received`
   * (pad usred obrade) ili `failed`: takav SME ponovo, jer bi inače
   * provajderov retry tiho progutao događaj koji nikad nije obrađen.
   */
  shouldProcess: boolean;
  previousStatus: "received" | "processed" | "skipped" | "failed" | null;
}

interface WebhookEventLean {
  _id: Types.ObjectId;
  status: "received" | "processed" | "skipped" | "failed";
}

function isDuplicateKey(error: unknown): boolean {
  return (error as { code?: number })?.code === 11000;
}

/**
 * Upiši događaj pre obrade i reci pozivaocu sme li da ga obradi.
 *
 * Unique `{provider, providerEventId}` je jedina prava ograda: od dve
 * istovremene isporuke istog događaja tačno jedna pravi zapis.
 */
export async function recordWebhookEvent(
  input: RecordWebhookEventInput,
): Promise<RecordedWebhookEvent> {
  await connectToDB();

  try {
    const created = await WebhookEvent.create({
      provider: input.provider,
      providerEventId: input.providerEventId,
      eventType: input.eventType,
      subjectRef: input.subjectRef ?? null,
      occurredAt: input.occurredAt,
      receivedAt: new Date(),
      signatureTs: input.signatureTs ?? null,
      payload: input.payload ?? {},
      status: "received",
    });
    return {
      eventId: created._id,
      duplicate: false,
      shouldProcess: true,
      previousStatus: null,
    };
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
  }

  const existing = await WebhookEvent.findOne({
    provider: input.provider,
    providerEventId: input.providerEventId,
  })
    .select("status")
    .lean<WebhookEventLean>();

  // Teorijski moguće ako je zapis obrisan između upisa i čitanja.
  if (!existing) {
    throw new Error(
      `Webhook događaj ${input.provider}:${input.providerEventId} je nestao posle konflikta.`,
    );
  }

  const settled = existing.status === "processed" || existing.status === "skipped";
  return {
    eventId: existing._id,
    duplicate: true,
    shouldProcess: !settled,
    previousStatus: existing.status,
  };
}

/**
 * Je li ovaj događaj prestignut novijim koji je već obrađen?
 *
 * Dedup rešava PONOVLJENU isporuku, ali ne i PRESTIZANJE: zakasneo
 * `subscription.updated` (star sat vremena) ne sme da pregazi
 * `subscription.canceled` koji je u međuvremenu obrađen. Oba su validna
 * događaja sa različitim `event_id`, pa ih unique ključ ne dodiruje.
 */
export async function isSupersededWebhookEvent(input: {
  provider: WebhookProvider;
  subjectRef: string | null;
  occurredAt: Date;
  eventId: Types.ObjectId;
}): Promise<boolean> {
  if (!input.subjectRef) return false;
  await connectToDB();

  const newer = await WebhookEvent.exists({
    _id: { $ne: input.eventId },
    provider: input.provider,
    subjectRef: input.subjectRef,
    status: "processed",
    occurredAt: { $gt: input.occurredAt },
  });
  return Boolean(newer);
}

export async function markWebhookProcessed(
  eventId: Types.ObjectId,
  tenantId?: string | Types.ObjectId | null,
): Promise<void> {
  await WebhookEvent.updateOne(
    { _id: eventId },
    {
      $set: {
        status: "processed",
        processedAt: new Date(),
        lastError: null,
        ...(tenantId ? { tenantId } : {}),
      },
      $inc: { attempts: 1 },
    },
  );
}

/** Događaj koji nas ne zanima ili je prestignut — razrešen, ne neuspeh. */
export async function markWebhookSkipped(
  eventId: Types.ObjectId,
  skipReason: string,
): Promise<void> {
  await WebhookEvent.updateOne(
    { _id: eventId },
    {
      $set: { status: "skipped", skipReason, processedAt: new Date() },
      $inc: { attempts: 1 },
    },
  );
}

/** Ostaje vidljiv i ponovo obradiv — nikad tiho progutan. */
export async function markWebhookFailed(
  eventId: Types.ObjectId,
  error: unknown,
): Promise<void> {
  await WebhookEvent.updateOne(
    { _id: eventId },
    {
      $set: {
        status: "failed",
        lastError: error instanceof Error ? error.message : String(error),
      },
      $inc: { attempts: 1 },
    },
  );
}
