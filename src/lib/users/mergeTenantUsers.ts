import "server-only";

// ─── Guest → Registered merge (Phase 4c) ──────────────────────────────────────
// Spaja duplikat nalog (obično GUEST) u "keeper" (obično registrovani). Premešta
// SVE reference (termini, loyalty, vaučeri, notifikacije, utisci, newsletter),
// spaja loyalty balans BEZ dvostrukog brojanja (reassign ledger → recomputeAccount
// iz ledgera) i PRENOSI agregatne brojače (posete/no-show/potrošnja/lifetime/streak)
// jer se oni NE drže u ledgeru. Idempotentno preko `mergedInto` guarda: ako je već
// spojen → no-op. Bez multi-doc transakcije: bezbedan redosled, marker se piše
// POSLEDNJI (crash usred → re-run ponavlja idempotentne korake; brojači se mogu
// blago preračunati → hvata ih Diagnostic "balance/recompute" provera).

import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { Appointment } from "@/models/Appointment";
import { LoyaltyLedger } from "@/models/LoyaltyLedger";
import { LoyaltyEvent } from "@/models/LoyaltyEvent";
import { LoyaltyAccount } from "@/models/LoyaltyAccount";
import { Voucher } from "@/models/Voucher";
import { Notification } from "@/models/Notification";
import { Testimonial } from "@/models/Testimonial";
import { AudienceContact } from "@/models/AudienceContact";
import { Referral } from "@/models/Referral";
import { getOrCreateAccount, recomputeAccount } from "@/lib/loyalty/accounts";
import { createLoyaltyNotification } from "@/lib/loyalty/notifications";

const CLIENT_ROLES = ["USER", "GUEST"];

export interface MergeResult {
  ok: boolean;
  alreadyMerged?: boolean;
  moved: {
    appointments: number;
    ledger: number;
    events: number;
    vouchers: number;
    notifications: number;
    testimonials: number;
    audience: number;
    referrals: number;
  };
}

interface SourceUserLean {
  _id: Types.ObjectId;
  role: string;
  mergedInto?: Types.ObjectId | null;
}

interface SourceAccountLean {
  _id: Types.ObjectId;
  heartsBalance?: number;
  pointsBalance?: number;
  completedVisits?: number;
  noShows?: number;
  totalSpend?: number;
  lifetimeHearts?: number;
  lifetimePoints?: number;
  currentStreak?: number;
  checkinStreak?: number;
  longestCheckinStreak?: number;
  lastVisitAt?: Date;
  lastCheckinAt?: Date;
  referralCode?: string;
}

const ZERO_MOVED = {
  appointments: 0,
  ledger: 0,
  events: 0,
  vouchers: 0,
  notifications: 0,
  testimonials: 0,
  audience: 0,
  referrals: 0,
};

export async function mergeTenantUsers(input: {
  tenantId: Types.ObjectId | string;
  sourceId: Types.ObjectId | string; // duplikat (obično GUEST)
  targetId: Types.ObjectId | string; // keeper (obično registrovani)
}): Promise<MergeResult> {
  await connectToDB();
  const tenantId = new Types.ObjectId(String(input.tenantId));
  const sourceId = new Types.ObjectId(String(input.sourceId));
  const targetId = new Types.ObjectId(String(input.targetId));

  if (sourceId.equals(targetId)) {
    throw new Error("Izvorni i ciljni nalog su isti.");
  }

  const [source, target] = await Promise.all([
    TenantUser.findOne({ _id: sourceId, tenantId })
      .select("role mergedInto")
      .lean<SourceUserLean | null>(),
    TenantUser.findOne({ _id: targetId, tenantId })
      .select("role mergedInto")
      .lean<SourceUserLean | null>(),
  ]);
  if (!source) throw new Error("Izvorni nalog nije nađen u ovom salonu.");
  if (!target) throw new Error("Ciljni nalog nije nađen u ovom salonu.");

  // ── Idempotencija: ako je izvor već spojen, ne radi ništa (guard protiv duplog klika/re-run) ──
  if (source.mergedInto) {
    return { ok: true, alreadyMerged: true, moved: { ...ZERO_MOVED } };
  }
  if (target.mergedInto) {
    throw new Error("Ciljni nalog je već spojen — izaberite aktivni nalog kao keeper.");
  }
  if (!CLIENT_ROLES.includes(source.role) || !CLIENT_ROLES.includes(target.role)) {
    throw new Error("Spajanje je dozvoljeno samo za klijentske naloge.");
  }

  // ── 1. Reassign referenci source→target (idempotentno) ──
  const [
    appts,
    events,
    vOwner,
    vGift,
    notifs,
    testis,
    audience,
    referralsAsReferrer,
    referralsAsReferred,
  ] =
    await Promise.all([
      Appointment.updateMany(
        { tenantId, clientProfileId: sourceId },
        { $set: { clientProfileId: targetId } },
      ),
      LoyaltyEvent.updateMany(
        { tenantId, subjectTenantUserId: sourceId },
        { $set: { subjectTenantUserId: targetId } },
      ),
      Voucher.updateMany(
        { tenantId, ownerTenantUserId: sourceId },
        { $set: { ownerTenantUserId: targetId } },
      ),
      Voucher.updateMany(
        { tenantId, giftedByTenantUserId: sourceId },
        { $set: { giftedByTenantUserId: targetId } },
      ),
      Notification.updateMany(
        { tenantId, recipientProfileId: sourceId },
        { $set: { recipientProfileId: targetId } },
      ),
      Testimonial.updateMany(
        { tenantId, clientProfileId: sourceId },
        { $set: { clientProfileId: targetId } },
      ),
      AudienceContact.updateMany(
        { tenantId, profileId: sourceId },
        { $set: { profileId: targetId } },
      ),
      Referral.updateMany(
        { tenantId, referrerTenantUserId: sourceId },
        { $set: { referrerTenantUserId: targetId } },
      ),
      Referral.updateMany(
        { tenantId, referredTenantUserId: sourceId },
        { $set: { referredTenantUserId: targetId } },
      ),
    ]);

  // Ako su izvor i keeper bili na suprotnim stranama iste preporuke, merge
  // otkriva da je to zapravo self-referral. Sačuvaj audit zapis, ali ga poništi.
  await Referral.updateMany(
    {
      tenantId,
      referrerTenantUserId: targetId,
      referredTenantUserId: targetId,
    },
    { $set: { status: "invalidated", failureReason: "self_referral" } },
  );

  // ── 2. Loyalty balans + agregatni brojači ──
  const targetAccount = await getOrCreateAccount(tenantId, targetId);
  const sourceAccount = await LoyaltyAccount.findOne({
    tenantId,
    tenantUserId: sourceId,
  }).lean<SourceAccountLean | null>();

  // Premesti ledger na target (accountId + tenantUserId); idempotencyKey ostaje
  // isti → unique {tenantId, idempotencyKey} netaknut (nema kolizije).
  await LoyaltyLedger.updateMany(
    { tenantId, tenantUserId: sourceId },
    { $set: { tenantUserId: targetId, accountId: targetAccount._id } },
  );
  // Hearts/points se preračuna iz (sada spojenog) ledgera — izvor istine.
  await recomputeAccount(targetAccount._id);

  if (sourceAccount) {
    // Agregatni brojači se NE drže u ledgeru → prenesi ručno:
    //  additivni ($inc), streak ($max), datumi ($max = najskoriji).
    const inc: Record<string, number> = {
      completedVisits: sourceAccount.completedVisits ?? 0,
      noShows: sourceAccount.noShows ?? 0,
      totalSpend: sourceAccount.totalSpend ?? 0,
      lifetimeHearts: sourceAccount.lifetimeHearts ?? 0,
      lifetimePoints: sourceAccount.lifetimePoints ?? 0,
    };
    const max: Record<string, number | Date> = {
      currentStreak: sourceAccount.currentStreak ?? 0,
      checkinStreak: sourceAccount.checkinStreak ?? 0,
      longestCheckinStreak: sourceAccount.longestCheckinStreak ?? 0,
    };
    if (sourceAccount.lastVisitAt) max.lastVisitAt = sourceAccount.lastVisitAt;
    if (sourceAccount.lastCheckinAt) max.lastCheckinAt = sourceAccount.lastCheckinAt;
    await LoyaltyAccount.updateOne(
      { _id: targetAccount._id },
      { $inc: inc, $max: max },
    );

    // referralCode: prebaci na target samo ako ga target NEMA (redosled zbog
    // unique partial-index), pa obriši source (unique {tenantId,tenantUserId}).
    const targetCode = (targetAccount as { referralCode?: string }).referralCode;
    const moveCode = !targetCode && sourceAccount.referralCode;
    await LoyaltyAccount.deleteOne({ _id: sourceAccount._id }); // oslobodi kod
    if (moveCode) {
      await LoyaltyAccount.updateOne(
        { _id: targetAccount._id },
        { $set: { referralCode: sourceAccount.referralCode } },
      );
    }
  }

  // ── 3. Soft-delete izvora — marker POSLEDNJI (audit + guard za re-run) ──
  await TenantUser.updateOne(
    { _id: sourceId, tenantId },
    { $set: { mergedInto: targetId, status: "suspended" } },
  );

  const moved = {
    appointments: appts.modifiedCount ?? 0,
    ledger: 0, // reassign je već primenjen; broj nije bitan za rezultat
    events: events.modifiedCount ?? 0,
    vouchers: (vOwner.modifiedCount ?? 0) + (vGift.modifiedCount ?? 0),
    notifications: notifs.modifiedCount ?? 0,
    testimonials: testis.modifiedCount ?? 0,
    audience: audience.modifiedCount ?? 0,
    referrals:
      (referralsAsReferrer.modifiedCount ?? 0) +
      (referralsAsReferred.modifiedCount ?? 0),
  };

  // ── 4. Obavesti klijenta (keeper) šta je dodato — tek posle admin merge-a,
  //      nikad ga ne pitamo "je l' ovo tvoj nalog" (zloupotreba). ──
  const addedHearts = sourceAccount?.heartsBalance ?? 0;
  const addedPoints = sourceAccount?.pointsBalance ?? 0;
  const addedVisits = sourceAccount?.completedVisits ?? 0;
  const addedVouchers = vOwner.modifiedCount ?? 0;
  const somethingAdded =
    addedHearts > 0 || addedPoints > 0 || addedVisits > 0 || addedVouchers > 0;
  if (target.role !== "GUEST" && somethingAdded) {
    const parts: string[] = [];
    if (addedHearts > 0) parts.push(`❤️ ${addedHearts}`);
    if (addedPoints > 0) parts.push(`⭐ ${addedPoints}`);
    if (addedVisits > 0) parts.push(`${addedVisits} poseta`);
    if (addedVouchers > 0) parts.push(`${addedVouchers} vaučer`);
    await createLoyaltyNotification({
      tenantId,
      recipientProfileId: targetId,
      type: "loyalty_adjustment",
      title: "Pronašli smo vaše prethodne nagrade 🎁",
      message: `Dodato na vaš nalog: ${parts.join(", ")}.`,
      metadata: {
        hearts: addedHearts,
        points: addedPoints,
      },
      celebration: true,
    });
  }

  return { ok: true, moved };
}
