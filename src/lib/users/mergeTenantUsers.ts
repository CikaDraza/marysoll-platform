import "server-only";

// ─── Guest → Registered merge (Phase 4c) ──────────────────────────────────────
// Spaja duplikat nalog (obično GUEST) u "keeper" (obično registrovani). Premešta
// SVE reference (termini, loyalty, vaučeri, notifikacije, utisci, newsletter) i
// spaja loyalty balans BEZ dvostrukog brojanja (reassign ledger → recomputeAccount
// iz ledgera). Idempotentno, bez multi-doc transakcije: bezbedan redosled,
// re-runnable. Soft-delete izvora (mergedInto + suspended) za audit/povratak.

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
import { getOrCreateAccount, recomputeAccount } from "@/lib/loyalty/accounts";

const CLIENT_ROLES = ["USER", "GUEST"];

export interface MergeResult {
  ok: boolean;
  moved: {
    appointments: number;
    ledger: number;
    events: number;
    vouchers: number;
    notifications: number;
    testimonials: number;
    audience: number;
  };
}

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
      .select("role")
      .lean<{ role: string } | null>(),
    TenantUser.findOne({ _id: targetId, tenantId })
      .select("role")
      .lean<{ role: string } | null>(),
  ]);
  if (!source) throw new Error("Izvorni nalog nije nađen u ovom salonu.");
  if (!target) throw new Error("Ciljni nalog nije nađen u ovom salonu.");
  if (!CLIENT_ROLES.includes(source.role) || !CLIENT_ROLES.includes(target.role)) {
    throw new Error("Spajanje je dozvoljeno samo za klijentske naloge.");
  }

  // ── 1. Reassign referenci source→target (idempotentno) ──
  const [appts, events, vOwner, vGift, notifs, testis, audience] =
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
    ]);

  // ── 2. Loyalty balans (bez dvostrukog brojanja) ──
  const targetAccount = await getOrCreateAccount(tenantId, targetId);
  // Premesti ledger na target (accountId + tenantUserId); idempotencyKey ostaje
  // isti → unique {tenantId, idempotencyKey} netaknut (nema kolizije).
  const ledgerRes = await LoyaltyLedger.updateMany(
    { tenantId, tenantUserId: sourceId },
    { $set: { tenantUserId: targetId, accountId: targetAccount._id } },
  );
  // Balans se preračuna iz (sada spojenog) ledgera — izvor istine.
  await recomputeAccount(targetAccount._id);

  // Source loyalty account: referralCode transfer (redosled zbog unique partial),
  // pa obriši (unique {tenantId, tenantUserId} ne sme da ostane dvostruk).
  const sourceAccount = await LoyaltyAccount.findOne({
    tenantId,
    tenantUserId: sourceId,
  }).lean<{ _id: Types.ObjectId; referralCode?: string } | null>();
  if (sourceAccount) {
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

  // ── 3. Soft-delete izvora (audit + povratak) ──
  await TenantUser.updateOne(
    { _id: sourceId, tenantId },
    { $set: { mergedInto: targetId, status: "suspended" } },
  );

  return {
    ok: true,
    moved: {
      appointments: appts.modifiedCount ?? 0,
      ledger: ledgerRes.modifiedCount ?? 0,
      events: events.modifiedCount ?? 0,
      vouchers: (vOwner.modifiedCount ?? 0) + (vGift.modifiedCount ?? 0),
      notifications: notifs.modifiedCount ?? 0,
      testimonials: testis.modifiedCount ?? 0,
      audience: audience.modifiedCount ?? 0,
    },
  };
}
