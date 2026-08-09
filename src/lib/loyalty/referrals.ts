import "server-only";

import { Types } from "mongoose";
import { Appointment } from "@/models/Appointment";
import { Referral } from "@/models/Referral";
import { TenantUser } from "@/models/TenantUser";
import { Voucher } from "@/models/Voucher";
import { connectToDB } from "@/lib/db/mongodb";
import { evaluateReferralCompletion } from "@/lib/platform/loyalty-client";
import { platformBus } from "@/lib/platform/event-bus";
import { registerPlatformSubscribers } from "@/lib/platform/subscribers";

interface TrackReferralBookingParams {
  tenantId: Types.ObjectId | string;
  referredTenantUserId: Types.ObjectId | string;
  appointmentId: Types.ObjectId | string;
  voucher: {
    _id: Types.ObjectId | string;
    origin?: string;
    giftedByTenantUserId?: Types.ObjectId | string | null;
  };
}

/** Idempotentno veže gift vaučer za registrovanu prijateljicu i njen termin. */
export async function trackReferralBooking(
  params: TrackReferralBookingParams,
): Promise<void> {
  const giftedBy = params.voucher.giftedByTenantUserId;
  if (params.voucher.origin !== "gift" || !giftedBy) return;
  if (String(giftedBy) === String(params.referredTenantUserId)) return;

  await connectToDB();
  await Referral.findOneAndUpdate(
    { tenantId: params.tenantId, sourceVoucherId: params.voucher._id },
    {
      $setOnInsert: {
        tenantId: params.tenantId,
        referrerTenantUserId: giftedBy,
        referredTenantUserId: params.referredTenantUserId,
        sourceVoucherId: params.voucher._id,
        firstAppointmentId: params.appointmentId,
        status: "booked",
        rewardGiven: false,
      },
    },
    { upsert: true },
  );
}

/**
 * Register + book + complete hard-gate. Ako svi dokazi prolaze, objavljuje
 * tipizovan platform event; Loyalty subscriber ga odmah upisuje u durabilni
 * LoyaltyEvent red, pa retry crona čuva nagradu od parcijalnih padova.
 */
export async function publishReferralCompletionForAppointment(params: {
  tenantId: Types.ObjectId | string;
  appointmentId: Types.ObjectId | string;
  referredTenantUserId: Types.ObjectId | string;
  appliedVoucherId?: Types.ObjectId | string | null;
  cycle: number;
}): Promise<void> {
  await connectToDB();
  const referral = await Referral.findOne({
    tenantId: params.tenantId,
    firstAppointmentId: params.appointmentId,
    status: "booked",
  }).lean<{
    _id: Types.ObjectId;
    referrerTenantUserId: Types.ObjectId;
    referredTenantUserId: Types.ObjectId;
    sourceVoucherId: Types.ObjectId;
  }>();
  if (!referral) return;

  const [user, voucher, priorCompletedVisits] = await Promise.all([
    TenantUser.findOne({
      _id: params.referredTenantUserId,
      tenantId: params.tenantId,
    })
      .select("role isEmailVerified")
      .lean<{ role: string; isEmailVerified?: boolean }>(),
    Voucher.findOne({
      _id: referral.sourceVoucherId,
      tenantId: params.tenantId,
    })
      .select("origin giftedByTenantUserId")
      .lean<{
        origin: string;
        giftedByTenantUserId?: Types.ObjectId | null;
      }>(),
    Appointment.countDocuments({
      tenantId: params.tenantId,
      clientProfileId: params.referredTenantUserId,
      status: "completed",
      _id: { $ne: params.appointmentId },
    }),
  ]);

  const gate = evaluateReferralCompletion({
    referrerClientId: voucher?.giftedByTenantUserId
      ? String(voucher.giftedByTenantUserId)
      : null,
    referredClientId: String(params.referredTenantUserId),
    referredRole: user?.role ?? "",
    isEmailVerified: Boolean(user?.isEmailVerified),
    voucherOrigin: voucher?.origin ?? "",
    appointmentUsesVoucher:
      Boolean(params.appliedVoucherId) &&
      String(params.appliedVoucherId) === String(referral.sourceVoucherId),
    priorCompletedVisits,
  });

  if (!gate.eligible) {
    await Referral.updateOne(
      { _id: referral._id, status: "booked" },
      { $set: { status: "invalidated", failureReason: gate.reason } },
    );
    return;
  }

  registerPlatformSubscribers();
  await platformBus.publish({
    type: "referral_completed",
    tenantId: String(params.tenantId),
    occurredAt: new Date().toISOString(),
    referrerClientId: String(referral.referrerTenantUserId),
    referredClientId: String(referral.referredTenantUserId),
    referralId: String(referral._id),
    appointmentId: String(params.appointmentId),
    cycle: params.cycle,
  });
}
