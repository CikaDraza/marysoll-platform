import "server-only";

// ─── Growth Studio: rules engine ──────────────────────────────────────────────
// Faza 1: built-in pravila izvedena direktno iz LoyaltyConfig-a (bez sinhronizacije
// sa LoyaltyRule kolekcijom). Registry ispod mapira tip događaja na handler —
// budući moduli (referral, birthday, win-back...) ovde registruju svoje handlere.
// Idempotencija: jedan događaj × jedno pravilo = najviše jedan ledger unos
// (ključ `evt:{eventId}:{ruleId}`), pa je ponovna obrada događaja no-op.

import { Types } from "mongoose";
import { LoyaltyAccount } from "@/models/LoyaltyAccount";
import { LoyaltyLedger } from "@/models/LoyaltyLedger";
import { Voucher } from "@/models/Voucher";
import { Referral } from "@/models/Referral";
import { Appointment } from "@/models/Appointment";
import { getOrCreateAccount } from "./accounts";
import { postLedgerEntry } from "./ledger";
import { issueVoucher, revokeVouchersIssuedForAppointment } from "./vouchers/service";
import { createLoyaltyNotification } from "./notifications";
import { computeStreakUpdate } from "@/lib/platform/loyalty-client";
import {
  formatCurrencyAmount,
  type LoyaltyConfigLean,
  type LoyaltyEventLean,
  type RewardSpec,
} from "./types";

export function describeReward(reward: RewardSpec): string {
  if (reward.type === "percent") return `${reward.value}% popusta`;
  if (reward.type === "fixed") return `${reward.value} RSD popusta`;
  return `Gratis: ${reward.serviceName || "usluga"}`;
}

// Registry: tip događaja → handler. Novi moduli dodaju svoje unose ovde.
const EVENT_HANDLERS: Record<
  string,
  (event: LoyaltyEventLean, config: LoyaltyConfigLean) => Promise<void>
> = {
  appointment_completed: handleCompleted,
  appointment_no_show: handleNoShow,
  appointment_completion_reverted: handleReverted,
  client_registered: handleRegistered,
  client_checkin: handleCheckin,
  referral_completed: handleReferralCompleted,
  // manual_adjustment se knjiži direktno u admin ruti (event je samo audit trag)
};

export async function applyRulesForEvent(
  event: LoyaltyEventLean,
  config: LoyaltyConfigLean,
): Promise<void> {
  const handler = EVENT_HANDLERS[event.type];
  if (handler) await handler(event, config);
}

// ─── appointment_completed ────────────────────────────────────────────────────

async function handleCompleted(
  event: LoyaltyEventLean,
  config: LoyaltyConfigLean,
): Promise<void> {
  const account = await getOrCreateAccount(
    event.tenantId,
    event.subjectTenantUserId,
  );
  const spend = Number(event.payload.spend) || 0;
  const serviceName = String(event.payload.serviceName || "");
  const appointmentId = event.payload.appointmentId;
  const hearts = config.currencies.hearts;
  const points = config.currencies.points;

  let heartsApplied = 0;
  let pointsApplied = 0;

  if (hearts.enabled && config.earning.heartsPerCompletedVisit > 0) {
    const res = await postLedgerEntry({
      tenantId: event.tenantId,
      accountId: account._id,
      tenantUserId: event.subjectTenantUserId,
      entryType: "earn",
      currency: "hearts",
      amount: config.earning.heartsPerCompletedVisit,
      source: {
        eventId: event._id,
        ruleId: "builtin:hearts_per_visit",
        appointmentId,
      },
      idempotencyKey: `evt:${event._id}:builtin:hearts_per_visit`,
      description: serviceName
        ? `Završena poseta — ${serviceName}`
        : "Završena poseta",
      maxPerDay: config.antiAbuse.maxHeartsPerDay,
    });
    heartsApplied = res.applied;
  }

  if (points.enabled && points.per100Rsd > 0 && spend > 0) {
    const amount = Math.floor((spend / 100) * points.per100Rsd);
    if (amount > 0) {
      const res = await postLedgerEntry({
        tenantId: event.tenantId,
        accountId: account._id,
        tenantUserId: event.subjectTenantUserId,
        entryType: "earn",
        currency: "points",
        amount,
        source: {
          eventId: event._id,
          ruleId: "builtin:points_per_spend",
          appointmentId,
        },
        idempotencyKey: `evt:${event._id}:builtin:points_per_spend`,
        description: serviceName
          ? `Potrošnja — ${serviceName}`
          : "Potrošnja u salonu",
        maxPerDay: config.antiAbuse.maxPointsPerDay,
      });
      pointsApplied = res.applied;
    }
  }

  // Brojači su informativni (balansi su ledger-zaštićeni) — retki retry posle
  // parcijalnog pada može da ih duplira; rekonsilijacija ih ne ispravlja.
  // currentStreak/lastVisitAt = POSTOJEĆE ponašanje (completion-driven),
  // netaknuto — check-in vodi ODVOJEN streak (checkinStreak), pa se ne diraju.
  await LoyaltyAccount.findByIdAndUpdate(account._id, {
    $inc: { completedVisits: 1, totalSpend: spend, currentStreak: 1 },
    $set: { lastVisitAt: new Date() },
  });

  // ── Milestone (punch-card): dovoljno srca → troše se na vaučer ──
  const milestone = config.milestones?.[0];
  let balanceAfter = 0;
  if (hearts.enabled) {
    const fresh = await LoyaltyAccount.findById(account._id)
      .select("heartsBalance")
      .lean<{ heartsBalance: number }>();
    balanceAfter = fresh?.heartsBalance ?? 0;
  }

  if (hearts.enabled && milestone && milestone.heartsRequired > 0) {
    for (let i = 0; i < 3 && balanceAfter >= milestone.heartsRequired; i++) {
      const res = await postLedgerEntry({
        tenantId: event.tenantId,
        accountId: account._id,
        tenantUserId: event.subjectTenantUserId,
        entryType: "redeem",
        currency: "hearts",
        amount: -milestone.heartsRequired,
        source: {
          eventId: event._id,
          ruleId: "builtin:hearts_milestone",
          appointmentId,
        },
        idempotencyKey: `evt:${event._id}:milestone:${i}`,
        description: `Nagrada osvojena — iskorišćeno ${formatCurrencyAmount(
          milestone.heartsRequired,
          hearts,
        )}`,
      });
      if (!res.duplicate && res.applied === 0) break;
      balanceAfter -= milestone.heartsRequired;

      // Voucher idempotencija na retry: tag nosi indeks u okviru događaja.
      const ruleTag = `builtin:hearts_milestone:${i}`;
      const existing = await Voucher.findOne({
        tenantId: event.tenantId,
        issuedByEventId: event._id,
        issuedByRuleId: ruleTag,
      }).lean();
      if (existing) continue;

      const reward = milestone.reward;
      const voucher = await issueVoucher({
        tenantId: event.tenantId,
        ownerTenantUserId: event.subjectTenantUserId,
        type: reward.type,
        value: reward.value,
        serviceScope: reward.serviceId ? [reward.serviceId] : [],
        serviceName: reward.serviceName,
        origin: "auto_rule",
        expiresDays: reward.expiresDays || 90,
        issuedByRuleId: ruleTag,
        issuedByEventId: event._id,
        issuedForAppointmentId: appointmentId,
      });

      await createLoyaltyNotification({
        tenantId: event.tenantId,
        recipientProfileId: event.subjectTenantUserId,
        type: "loyalty_voucher_received",
        title: "Nagrada otključana! 🎁",
        message: `Osvojili ste: ${describeReward(reward)} — kod ${voucher.code}`,
        appointmentId,
        celebration: true,
        metadata: {
          voucherCode: voucher.code,
          voucherType: voucher.type,
          voucherValue: voucher.value,
          voucherExpiresAt: voucher.expiresAt
            ? new Date(voucher.expiresAt).toISOString().slice(0, 10)
            : undefined,
        },
      });
    }
  }

  // ── Notifikacija o zaradi (jedna po poseti, celebration moment) ──
  if (heartsApplied > 0 || pointsApplied > 0) {
    const parts: string[] = [];
    if (heartsApplied > 0) {
      parts.push(`+${formatCurrencyAmount(heartsApplied, hearts)} ${hearts.emoji}`);
    }
    if (pointsApplied > 0) {
      parts.push(`+${formatCurrencyAmount(pointsApplied, points)} ${points.emoji}`);
    }
    let progress = "";
    if (
      hearts.enabled &&
      milestone &&
      milestone.heartsRequired > 0 &&
      balanceAfter < milestone.heartsRequired
    ) {
      const remaining = milestone.heartsRequired - balanceAfter;
      progress = ` — još ${formatCurrencyAmount(remaining, hearts)} do nagrade`;
    }

    await createLoyaltyNotification({
      tenantId: event.tenantId,
      recipientProfileId: event.subjectTenantUserId,
      type: heartsApplied > 0 ? "loyalty_hearts_earned" : "loyalty_points_earned",
      title: "Hvala na poseti! ✨",
      message: `${parts.join(" i ")}${progress}`,
      appointmentId,
      celebration: true,
      metadata: {
        hearts: heartsApplied,
        points: pointsApplied,
        heartsBalance: balanceAfter,
        heartsRequired: milestone?.heartsRequired,
        serviceName,
      },
    });
  }
}

// ─── client_checkin (Phase 1: QR check-in → streak + poeni) ───────────────────

async function handleCheckin(
  event: LoyaltyEventLean,
  config: LoyaltyConfigLean,
): Promise<void> {
  const account = await getOrCreateAccount(
    event.tenantId,
    event.subjectTenantUserId,
  );

  // Fiksni timestamp iz eventa (retry-safe: streak je deterministički, a
  // ponovni pokušaj vidi lastVisitAt === visitAt → gapDays 0 → no-op).
  const visitAt = event.payload.timestamp
    ? new Date(String(event.payload.timestamp))
    : new Date();

  // ── Streak (navika) preko čiste logike iz @panta/loyalty-engine ──
  // ODVOJENA polja (checkinStreak/lastCheckinAt) da NE diramo completion-driven
  // currentStreak — postojeći saloni rade identično, check-in je aditivan.
  const next = computeStreakUpdate(
    {
      currentStreak: account.checkinStreak ?? 0,
      longestStreak: account.longestCheckinStreak ?? 0,
      lastVisitAt: account.lastCheckinAt
        ? new Date(account.lastCheckinAt).toISOString()
        : null,
    },
    visitAt,
    { windowDays: config.streak?.windowDays ?? 45 },
  );
  await LoyaltyAccount.findByIdAndUpdate(account._id, {
    $set: {
      checkinStreak: next.currentStreak,
      longestCheckinStreak: next.longestStreak,
      lastCheckinAt: next.lastVisitAt ? new Date(next.lastVisitAt) : visitAt,
    },
  });

  // ── Check-in poeni (idempotentno preko ledger ključa; traži points.enabled) ──
  const points = config.currencies.points;
  const checkinPoints = config.earning.checkinPoints ?? 0;
  if (points.enabled && checkinPoints > 0) {
    await postLedgerEntry({
      tenantId: event.tenantId,
      accountId: account._id,
      tenantUserId: event.subjectTenantUserId,
      entryType: "earn",
      currency: "points",
      amount: checkinPoints,
      source: { eventId: event._id, ruleId: "builtin:checkin_points" },
      idempotencyKey: `evt:${event._id}:builtin:checkin_points`,
      description: "Check-in u salonu",
      maxPerDay: config.antiAbuse.maxPointsPerDay,
    });
  }
}

// ─── appointment_no_show ──────────────────────────────────────────────────────

async function handleNoShow(
  event: LoyaltyEventLean,
  config: LoyaltyConfigLean,
): Promise<void> {
  const account = await getOrCreateAccount(
    event.tenantId,
    event.subjectTenantUserId,
  );
  const policy = config.noShowPolicy;

  const update: Record<string, unknown> = { $inc: { noShows: 1 } };
  if (policy.mode === "streak_reset" || policy.mode === "hearts_penalty") {
    update.$set = { currentStreak: 0 };
  }
  await LoyaltyAccount.findByIdAndUpdate(account._id, update);

  if (
    policy.mode === "hearts_penalty" &&
    policy.heartsPenalty > 0 &&
    config.currencies.hearts.enabled
  ) {
    const res = await postLedgerEntry({
      tenantId: event.tenantId,
      accountId: account._id,
      tenantUserId: event.subjectTenantUserId,
      entryType: "revoke",
      currency: "hearts",
      amount: -policy.heartsPenalty,
      source: {
        eventId: event._id,
        ruleId: "builtin:no_show_penalty",
        appointmentId: event.payload.appointmentId,
      },
      idempotencyKey: `evt:${event._id}:builtin:no_show_penalty`,
      description: "Propušten termin",
    });
    if (res.applied !== 0) {
      await createLoyaltyNotification({
        tenantId: event.tenantId,
        recipientProfileId: event.subjectTenantUserId,
        type: "loyalty_adjustment",
        title: "Propušten termin",
        message: `${formatCurrencyAmount(res.applied, config.currencies.hearts)} ${config.currencies.hearts.emoji} zbog propuštenog termina`,
        appointmentId: event.payload.appointmentId,
        metadata: { hearts: res.applied },
      });
    }
  }
}

// ─── appointment_completion_reverted ──────────────────────────────────────────
// Admin je vratio status sa "completed" — kompenzacioni unosi poništavaju NET
// efekat svih builtin knjiženja vezanih za termin (earn + milestone redeem +
// prethodne kompenzacije), pa je stanje tačno i posle više ciklusa
// completed → revert → completed.

async function handleReverted(
  event: LoyaltyEventLean,
  config: LoyaltyConfigLean,
): Promise<void> {
  const account = await getOrCreateAccount(
    event.tenantId,
    event.subjectTenantUserId,
  );
  const appointmentId = event.payload.appointmentId;
  const revertCount = Number(event.payload.revertCount) || 1;
  const spend = Number(event.payload.spend) || 0;
  if (!appointmentId) return;

  const sums = await LoyaltyLedger.aggregate([
    {
      $match: {
        tenantId: new Types.ObjectId(String(event.tenantId)),
        accountId: new Types.ObjectId(String(account._id)),
        "source.appointmentId": new Types.ObjectId(String(appointmentId)),
        "source.ruleId": { $regex: "^builtin:" },
      },
    },
    { $group: { _id: "$currency", total: { $sum: "$amount" } } },
  ]);

  let reverted = false;
  for (const sum of sums) {
    if (!sum.total) continue;
    const res = await postLedgerEntry({
      tenantId: event.tenantId,
      accountId: account._id,
      tenantUserId: event.subjectTenantUserId,
      entryType: "revoke",
      currency: sum._id as "hearts" | "points",
      amount: -sum.total,
      source: {
        eventId: event._id,
        ruleId: "builtin:revert",
        appointmentId,
      },
      idempotencyKey: `appt:${appointmentId}:revert:${revertCount}:${sum._id}`,
      description: "Ispravka — termin nije završen",
    });
    if (res.applied !== 0) reverted = true;
  }

  await LoyaltyAccount.findByIdAndUpdate(account._id, {
    $inc: { completedVisits: -1, totalSpend: -spend },
  });

  await revokeVouchersIssuedForAppointment(appointmentId);
  await revertReferralReward(
    event.tenantId,
    String(appointmentId),
    revertCount,
    event._id,
  );

  if (reverted) {
    await createLoyaltyNotification({
      tenantId: event.tenantId,
      recipientProfileId: event.subjectTenantUserId,
      type: "loyalty_adjustment",
      title: "Ispravka nagrade",
      message:
        "Nagrada za termin je povučena jer termin nije označen kao završen.",
      appointmentId,
      metadata: {},
    });
  }
  void config;
}

// ─── client_registered ────────────────────────────────────────────────────────

async function handleRegistered(
  event: LoyaltyEventLean,
  config: LoyaltyConfigLean,
): Promise<void> {
  const bonus = config.earning.welcomeBonusPoints;
  if (!config.currencies.points.enabled || bonus <= 0) return;

  const account = await getOrCreateAccount(
    event.tenantId,
    event.subjectTenantUserId,
  );
  const res = await postLedgerEntry({
    tenantId: event.tenantId,
    accountId: account._id,
    tenantUserId: event.subjectTenantUserId,
    entryType: "earn",
    currency: "points",
    amount: bonus,
    source: { eventId: event._id, ruleId: "builtin:welcome_bonus" },
    idempotencyKey: `evt:${event._id}:builtin:welcome_bonus`,
    description: "Bonus dobrodošlice",
    maxPerDay: config.antiAbuse.maxPointsPerDay,
  });

  if (res.applied > 0) {
    await createLoyaltyNotification({
      tenantId: event.tenantId,
      recipientProfileId: event.subjectTenantUserId,
      type: "loyalty_points_earned",
      title: "Dobrodošli! 🎉",
      message: `+${formatCurrencyAmount(res.applied, config.currencies.points)} ${config.currencies.points.emoji} bonus dobrodošlice`,
      celebration: true,
      metadata: { points: res.applied },
    });
  }
}

// ─── referral_completed (Phase 2b hard-gate) ─────────────────────────────────

async function handleReferralCompleted(
  event: LoyaltyEventLean,
  config: LoyaltyConfigLean,
): Promise<void> {
  const referralId = String(event.payload.referralId ?? "");
  if (!referralId) return;

  const referral = await Referral.findOne({
    _id: referralId,
    tenantId: event.tenantId,
    status: { $in: ["booked", "completed"] },
  }).lean<{
    _id: Types.ObjectId;
    referrerTenantUserId: Types.ObjectId;
    referredTenantUserId: Types.ObjectId;
    sourceVoucherId: Types.ObjectId;
    firstAppointmentId: Types.ObjectId;
  }>();
  if (!referral) return;

  // Event je durabilan i može biti retry-ovan kasnije. Ponovo proveri trenutno
  // stanje termina da failed event ne bi nagradio posetu koja je u međuvremenu
  // revertovana ili kojoj je uklonjen gift vaučer.
  const stillCompleted = await Appointment.exists({
    _id: referral.firstAppointmentId,
    tenantId: event.tenantId,
    clientProfileId: referral.referredTenantUserId,
    appliedVoucherId: referral.sourceVoucherId,
    status: "completed",
  });
  if (!stillCompleted) return;

  const [referrerAccount, referredAccount] = await Promise.all([
    getOrCreateAccount(event.tenantId, referral.referrerTenantUserId),
    getOrCreateAccount(event.tenantId, referral.referredTenantUserId),
  ]);

  // Jedna nova osoba može pripasti tačno jednom referral-u. Retry ISTOG
  // referral-a prolazi, drugi referral za istu osobu se invalidira.
  const attributed = await LoyaltyAccount.findOneAndUpdate(
    {
      _id: referredAccount._id,
      $or: [
        { referredByReferralId: { $exists: false } },
        { referredByReferralId: null },
        { referredByReferralId: referral._id },
      ],
    },
    {
      $set: {
        referredByAccountId: referrerAccount._id,
        referredByReferralId: referral._id,
      },
    },
    { new: true },
  ).lean();

  if (!attributed) {
    await Referral.updateOne(
      { _id: referral._id },
      { $set: { status: "invalidated", failureReason: "already_attributed" } },
    );
    return;
  }

  const rewardPoints = Math.max(
    0,
    Math.trunc(config.sharing?.referrerRewardPoints ?? 100),
  );
  const cycle = Math.max(0, Math.trunc(Number(event.payload.cycle) || 0));
  let applied = 0;
  let duplicate = false;
  if (config.currencies.points.enabled && rewardPoints > 0) {
    const result = await postLedgerEntry({
      tenantId: event.tenantId,
      accountId: referrerAccount._id,
      tenantUserId: referral.referrerTenantUserId,
      entryType: "earn",
      currency: "points",
      amount: rewardPoints,
      source: {
        eventId: event._id,
        ruleId: "builtin:referral_reward",
        appointmentId: referral.firstAppointmentId,
      },
      // Novi completion ciklus posle revert-a sme ponovo da dodeli nagradu;
      // retry istog ciklusa ostaje idempotentan.
      idempotencyKey: `referral:${referral._id}:reward:c${cycle}`,
      description: "Prijateljica je završila prvu posetu",
    });
    applied = result.applied;
    duplicate = result.duplicate;
  }

  const rewardGiven = applied > 0 || duplicate;
  await Referral.updateOne(
    { _id: referral._id },
    {
      $set: {
        status: rewardGiven ? "rewarded" : "completed",
        completedAt: new Date(),
        rewardGiven,
        rewardPoints: rewardGiven ? rewardPoints : 0,
        rewardGivenAt: rewardGiven ? new Date() : null,
        failureReason: null,
      },
    },
  );

  if (applied > 0) {
    await createLoyaltyNotification({
      tenantId: event.tenantId,
      recipientProfileId: referral.referrerTenantUserId,
      type: "loyalty_points_earned",
      title: "Prijateljica je stigla! 🎉",
      message: `+${formatCurrencyAmount(applied, config.currencies.points)} ${config.currencies.points.emoji} jer je završila prvu posetu`,
      appointmentId: referral.firstAppointmentId,
      celebration: true,
      metadata: { points: applied },
    });
  }
}

async function revertReferralReward(
  tenantId: Types.ObjectId | string,
  appointmentId: string,
  revertCount: number,
  eventId: Types.ObjectId,
): Promise<void> {
  const referral = await Referral.findOne({
    tenantId,
    firstAppointmentId: appointmentId,
    status: { $in: ["completed", "rewarded"] },
  }).lean<{
    _id: Types.ObjectId;
    referrerTenantUserId: Types.ObjectId;
    referredTenantUserId: Types.ObjectId;
    rewardGiven?: boolean;
    rewardPoints?: number;
  }>();
  if (!referral) return;

  if (referral.rewardGiven && (referral.rewardPoints ?? 0) > 0) {
    const account = await getOrCreateAccount(
      tenantId,
      referral.referrerTenantUserId,
    );
    await postLedgerEntry({
      tenantId,
      accountId: account._id,
      tenantUserId: referral.referrerTenantUserId,
      entryType: "revoke",
      currency: "points",
      amount: -(referral.rewardPoints ?? 0),
      source: {
        eventId,
        ruleId: "builtin:referral_revert",
        appointmentId,
      },
      idempotencyKey: `referral:${referral._id}:revert:${revertCount}`,
      description: "Referral nagrada povučena — poseta nije završena",
    });
  }

  await Promise.all([
    Referral.updateOne(
      { _id: referral._id },
      {
        $set: {
          status: "booked",
          rewardGiven: false,
          rewardPoints: 0,
          rewardGivenAt: null,
          completedAt: null,
        },
      },
    ),
    LoyaltyAccount.updateOne(
      {
        tenantId,
        tenantUserId: referral.referredTenantUserId,
        referredByReferralId: referral._id,
      },
      { $unset: { referredByReferralId: 1, referredByAccountId: 1 } },
    ),
  ]);
}
