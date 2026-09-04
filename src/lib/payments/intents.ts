import "server-only";

/**
 * Naplata na terminu — jedan server autoritet (Faza 1, `provider: "manual"`).
 *
 * Ceo domen se dokazuje pre nego što ijedan novac prođe kroz treću stranu:
 * salon beleži keš ili uplatu na račun, a model, ledger, poravnanje i granice
 * rade isto kao što će raditi sa stvarnim provajderom.
 *
 * TVRDA GRANICA prema cenama: ovde se NE računa cena termina. `amountDue`
 * dolazi gotov iz Appointment Checkout-a; naplata nikad ne piše `pricing.*`.
 * Dva registra, nijedan se ne izvodi iz drugog:
 *
 *   pricing.chargedAmount   koliko je termin VREDEO
 *   PaymentLedger           kako je novac STIGAO i gde je sada
 */

import { Types, type ClientSession } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { PaymentIntent } from "@/models/PaymentIntent";
import { PaymentLedger } from "@/models/PaymentLedger";
import { runLoyaltyTransaction } from "@/lib/loyalty/transaction";
import { LoyaltyRedemptionError } from "@/lib/loyalty/errors";
import {
  isValidChargeAmount,
  settleAppointment,
  type AppointmentSettlement,
} from "@/lib/platform/payments-client";

export type PaymentPurpose =
  | "appointment_deposit"
  | "appointment_balance"
  | "appointment_full";

export interface PaymentActor {
  tenantId: string;
  adminTenantUserId?: string | null;
}

interface LedgerRow {
  amountMinor: number;
}

/** Naplaćeni iznosi koje je ovaj termin video kroz platformu. */
async function ledgerEntriesFor(
  tenantId: Types.ObjectId | string,
  appointmentId: Types.ObjectId | string,
  session?: ClientSession,
): Promise<LedgerRow[]> {
  const query = PaymentLedger.find({
    tenantId,
    "subject.type": "appointment",
    "subject.id": appointmentId,
  }).select("amountMinor");
  if (session) query.session(session);
  return query.lean<LedgerRow[]>();
}

/**
 * Poravnanje termina — koliko je stiglo kroz platformu i koliko još treba.
 *
 * `amountDueMinor` je ono što Checkout kaže da termin vredi POSLE pogodnosti.
 * Ako cena još nije poznata, prosleđuje se `null` i poravnanje ne tvrdi
 * koliko fali.
 */
export async function appointmentSettlement(input: {
  tenantId: string;
  appointmentId: string;
  amountDueMinor: number | null;
}): Promise<AppointmentSettlement> {
  await connectToDB();
  const entries = await ledgerEntriesFor(input.tenantId, input.appointmentId);
  return settleAppointment({
    amountDueMinor: input.amountDueMinor,
    entries,
  });
}

export interface CreateIntentInput {
  actor: PaymentActor;
  appointmentId: string;
  clientTenantUserId?: string | null;
  purpose: PaymentPurpose;
  amountMinor: number;
  /** Osnovica nad kojom je iznos izračunat — zamrzava se uz nameru. */
  pricedAgainst?: {
    preBenefitAmountMinor?: number | null;
    benefitVoucherId?: string | null;
    benefitDiscountMinor?: number | null;
    amountDueMinor?: number | null;
    servicesFingerprint?: string | null;
  };
  policySnapshot?: Record<string, unknown>;
  /** Deterministički — dupli klik ne sme da iskuje dve namere. */
  idempotencyKey: string;
}

export interface PaymentIntentView {
  intentId: string;
  status: string;
  amountMinor: number;
  purpose: PaymentPurpose;
  /** Namera je već postojala pod istim ključem. */
  idempotentReplay: boolean;
}

interface IntentRow {
  _id: Types.ObjectId;
  status: string;
  amountMinor: number;
  purpose: PaymentPurpose;
  subject?: { id: Types.ObjectId };
  pricedAgainst?: { benefitVoucherId?: Types.ObjectId | null };
}

function isDuplicateKey(error: unknown): boolean {
  return (error as { code?: number })?.code === 11000;
}

/**
 * Traži naplatu određenog iznosa. Novac se time još NE kreće.
 *
 * Retry istog ključa vraća postojeću nameru umesto da napravi drugu — isti
 * obrazac kao points-shop kupovina u loyalty domenu.
 */
export async function createPaymentIntent(
  input: CreateIntentInput,
): Promise<PaymentIntentView> {
  await connectToDB();

  if (!isValidChargeAmount(input.amountMinor)) {
    throw new LoyaltyRedemptionError(
      "INVALID",
      "Iznos naplate mora biti ceo broj para veći od nule.",
    );
  }

  try {
    const created = await PaymentIntent.create({
      tenantId: input.actor.tenantId,
      clientTenantUserId: input.clientTenantUserId ?? null,
      purpose: input.purpose,
      subject: { type: "appointment", id: input.appointmentId },
      amountMinor: input.amountMinor,
      currency: "RSD",
      pricedAgainst: input.pricedAgainst,
      policySnapshot: input.policySnapshot,
      status: "requires_payment",
      provider: "manual",
      idempotencyKey: input.idempotencyKey,
      createdByTenantUserId: input.actor.adminTenantUserId ?? null,
    });
    return {
      intentId: String(created._id),
      status: created.status,
      amountMinor: created.amountMinor,
      purpose: created.purpose,
      idempotentReplay: false,
    };
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
  }

  const existing = await PaymentIntent.findOne({
    tenantId: input.actor.tenantId,
    idempotencyKey: input.idempotencyKey,
  })
    .select("status amountMinor purpose")
    .lean<IntentRow>();
  if (!existing) {
    throw new LoyaltyRedemptionError("CONFLICT", "Namera naplate nije dostupna.");
  }
  return {
    intentId: String(existing._id),
    status: existing.status,
    amountMinor: existing.amountMinor,
    purpose: existing.purpose,
    idempotentReplay: true,
  };
}

/**
 * Novac je stigao — namera se zatvara i knjiži u ledger.
 *
 * Sve u JEDNOJ transakciji: ne sme postojati stanje „namera je `settled`, a
 * ledger prazan" ni obrnuto. CAS na status je ograda protiv dvostrukog
 * knjiženja, a unique idempotency ključ na ledgeru je druga ograda ispod nje.
 */
export async function settlePaymentIntent(input: {
  actor: PaymentActor;
  intentId: string;
  /** Kome novac pripada. Depozit koji držimo za salon je `salon_payable`. */
  account?: "client_funds" | "salon_payable" | "platform_revenue";
  description: string;
}): Promise<{ settled: boolean; amountMinor: number; idempotentReplay: boolean }> {
  await connectToDB();
  if (!Types.ObjectId.isValid(input.intentId)) {
    throw new LoyaltyRedemptionError("NOT_FOUND", "Namera naplate nije pronađena.");
  }

  return runLoyaltyTransaction(async (session) => {
    const intent = await PaymentIntent.findOne({
      _id: new Types.ObjectId(input.intentId),
      tenantId: input.actor.tenantId,
    })
      .session(session)
      .lean<IntentRow>();
    if (!intent) {
      throw new LoyaltyRedemptionError("NOT_FOUND", "Namera naplate nije pronađena.");
    }

    if (intent.status === "settled") {
      return {
        settled: true,
        amountMinor: intent.amountMinor,
        idempotentReplay: true,
      };
    }
    if (intent.status !== "requires_payment" && intent.status !== "processing") {
      throw new LoyaltyRedemptionError(
        "CONFLICT",
        "Namera naplate je već razrešena i ne može se naplatiti.",
      );
    }

    // CAS: od dva paralelna zatvaranja prolazi tačno jedno.
    const claimed = await PaymentIntent.findOneAndUpdate(
      {
        _id: intent._id,
        status: { $in: ["requires_payment", "processing"] },
      },
      { $set: { status: "settled", settledAt: new Date() } },
      { new: true, session },
    ).lean<IntentRow>();
    if (!claimed) {
      throw new LoyaltyRedemptionError(
        "CONFLICT",
        "Naplata je upravo razrešena na drugom mestu.",
      );
    }

    await PaymentLedger.create(
      [
        {
          tenantId: input.actor.tenantId,
          intentId: intent._id,
          subject: { type: "appointment", id: intent.subject?.id },
          entryType: "capture",
          amountMinor: intent.amountMinor,
          currency: "RSD",
          account: input.account ?? "salon_payable",
          occurredAt: new Date(),
          source: {
            ...(input.actor.adminTenantUserId
              ? { adminUserId: input.actor.adminTenantUserId }
              : {}),
          },
          // Izveden iz namere, nikad slučajan — ponovljeno zatvaranje daje isti
          // ključ i E11000-preskače.
          idempotencyKey: `intent:${String(intent._id)}:capture`,
          description: input.description,
        },
      ],
      { session },
    );

    return {
      settled: true,
      amountMinor: intent.amountMinor,
      idempotentReplay: false,
    };
  });
}

/** Vaučer nad kojim je naplata izvršena — ulaz za zaključavanje pogodnosti. */
export async function lockedBenefitVoucherId(input: {
  tenantId: string;
  appointmentId: string;
}): Promise<string | null> {
  await connectToDB();
  const settled = await PaymentIntent.findOne({
    tenantId: input.tenantId,
    "subject.type": "appointment",
    "subject.id": input.appointmentId,
    status: "settled",
  })
    .select("pricedAgainst")
    .lean<IntentRow>();
  const voucherId = settled?.pricedAgainst?.benefitVoucherId;
  return voucherId ? String(voucherId) : null;
}
