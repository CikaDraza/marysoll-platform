import "server-only";

// ─── Merge preview (Phase 4c dopuna) ──────────────────────────────────────────
// Read-only: računa šta će merge da pomeri i before/after zbir, da admin modal NE
// računa na frontu. Isti izvor koristi i /merge/preview endpoint i sam merge
// (server-side enforce `allowed` pre mutacije). Nikad ne mutira.

import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { LoyaltyAccount } from "@/models/LoyaltyAccount";
import { LoyaltyLedger } from "@/models/LoyaltyLedger";
import { LoyaltyEvent } from "@/models/LoyaltyEvent";
import { Appointment } from "@/models/Appointment";
import { Voucher } from "@/models/Voucher";
import { Notification } from "@/models/Notification";
import { Testimonial } from "@/models/Testimonial";
import { AudienceContact } from "@/models/AudienceContact";
import { Referral } from "@/models/Referral";

const CLIENT_ROLES = ["USER", "GUEST"];

export interface MergeAccountSummary {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isRegistered: boolean;
  status: string;
  hearts: number;
  points: number;
  visits: number;
  appointments: number;
  vouchers: number;
}

export interface MergeMoves {
  appointments: number;
  ledgerEntries: number;
  loyaltyEvents: number;
  vouchersOwned: number;
  vouchersGifted: number; // referral veze (pozvao prijateljicu)
  referralsAsReferrer: number;
  referralsAsReferred: number;
  notifications: number;
  testimonials: number;
  audienceContacts: number;
}

export interface MergePreview {
  allowed: boolean;
  reason?: string;
  source: MergeAccountSummary | null;
  target: MergeAccountSummary | null;
  after: {
    hearts: number;
    points: number;
    visits: number;
    appointments: number;
    vouchers: number;
  } | null;
  moves: MergeMoves | null;
  risks: string[];
}

interface UserLean {
  _id: Types.ObjectId;
  name?: string;
  email?: string;
  phone?: string;
  role: string;
  status?: string;
  mergedInto?: Types.ObjectId | null;
}

interface AccountLean {
  heartsBalance?: number;
  pointsBalance?: number;
  completedVisits?: number;
  referralCode?: string;
}

async function summarize(
  tenantId: Types.ObjectId,
  user: UserLean,
): Promise<{ summary: MergeAccountSummary; referralCode?: string }> {
  const account = await LoyaltyAccount.findOne({
    tenantId,
    tenantUserId: user._id,
  })
    .select("heartsBalance pointsBalance completedVisits referralCode")
    .lean<AccountLean | null>();
  const [vouchers, appointments] = await Promise.all([
    Voucher.countDocuments({ tenantId, ownerTenantUserId: user._id }),
    Appointment.countDocuments({ tenantId, clientProfileId: user._id }),
  ]);
  return {
    summary: {
      _id: String(user._id),
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      role: user.role,
      isRegistered: user.role !== "GUEST",
      status: user.status ?? "active",
      hearts: account?.heartsBalance ?? 0,
      points: account?.pointsBalance ?? 0,
      visits: account?.completedVisits ?? 0,
      appointments,
      vouchers,
    },
    referralCode: account?.referralCode,
  };
}

export async function buildMergePreview(input: {
  tenantId: Types.ObjectId | string;
  sourceId: Types.ObjectId | string;
  targetId: Types.ObjectId | string;
}): Promise<MergePreview> {
  await connectToDB();
  const tenantId = new Types.ObjectId(String(input.tenantId));
  const sourceId = new Types.ObjectId(String(input.sourceId));
  const targetId = new Types.ObjectId(String(input.targetId));

  const empty: MergePreview = {
    allowed: false,
    source: null,
    target: null,
    after: null,
    moves: null,
    risks: [],
  };

  if (sourceId.equals(targetId)) {
    return { ...empty, reason: "Izvorni i ciljni nalog su isti." };
  }

  const [sourceUser, targetUser] = await Promise.all([
    TenantUser.findOne({ _id: sourceId, tenantId })
      .select("name email phone role status mergedInto")
      .lean<UserLean | null>(),
    TenantUser.findOne({ _id: targetId, tenantId })
      .select("name email phone role status mergedInto")
      .lean<UserLean | null>(),
  ]);
  if (!sourceUser) return { ...empty, reason: "Izvorni nalog nije nađen u ovom salonu." };
  if (!targetUser) return { ...empty, reason: "Ciljni nalog nije nađen u ovom salonu." };

  const [src, tgt] = await Promise.all([
    summarize(tenantId, sourceUser),
    summarize(tenantId, targetUser),
  ]);

  const [
    appointments,
    ledgerEntries,
    loyaltyEvents,
    vouchersOwned,
    vouchersGifted,
    referralsAsReferrer,
    referralsAsReferred,
    notifications,
    testimonials,
    audienceContacts,
  ] = await Promise.all([
    Appointment.countDocuments({ tenantId, clientProfileId: sourceId }),
    LoyaltyLedger.countDocuments({ tenantId, tenantUserId: sourceId }),
    LoyaltyEvent.countDocuments({ tenantId, subjectTenantUserId: sourceId }),
    Voucher.countDocuments({ tenantId, ownerTenantUserId: sourceId }),
    Voucher.countDocuments({ tenantId, giftedByTenantUserId: sourceId }),
    Referral.countDocuments({ tenantId, referrerTenantUserId: sourceId }),
    Referral.countDocuments({ tenantId, referredTenantUserId: sourceId }),
    Notification.countDocuments({ tenantId, recipientProfileId: sourceId }),
    Testimonial.countDocuments({ tenantId, clientProfileId: sourceId }),
    AudienceContact.countDocuments({ tenantId, profileId: sourceId }),
  ]);

  const moves: MergeMoves = {
    appointments,
    ledgerEntries,
    loyaltyEvents,
    vouchersOwned,
    vouchersGifted,
    referralsAsReferrer,
    referralsAsReferred,
    notifications,
    testimonials,
    audienceContacts,
  };

  const after = {
    hearts: src.summary.hearts + tgt.summary.hearts,
    points: src.summary.points + tgt.summary.points,
    visits: src.summary.visits + tgt.summary.visits,
    appointments: src.summary.appointments + tgt.summary.appointments,
    vouchers: src.summary.vouchers + tgt.summary.vouchers,
  };

  // ── allowed / reason ──
  let allowed = true;
  let reason: string | undefined;
  if (sourceUser.mergedInto) {
    allowed = false;
    reason = "Izvorni nalog je već spojen u drugi nalog.";
  } else if (targetUser.mergedInto) {
    allowed = false;
    reason = "Ciljni nalog je već spojen — izaberite aktivni nalog kao keeper.";
  } else if (
    !CLIENT_ROLES.includes(sourceUser.role) ||
    !CLIENT_ROLES.includes(targetUser.role)
  ) {
    allowed = false;
    reason = "Spajanje je dozvoljeno samo za klijentske naloge.";
  }

  // ── risks (upozorenja, ne blokiraju) ──
  const risks: string[] = [];
  if (allowed) {
    if (!tgt.summary.isRegistered) {
      risks.push(
        "Keeper nije registrovan nalog — preporučeno je da keeper bude registrovani klijent.",
      );
    }
    if (src.summary.isRegistered) {
      risks.push(
        "Izvorni nalog je REGISTROVAN — spaja se u drugi nalog; proverite smer.",
      );
    }
    if (src.referralCode && tgt.referralCode && src.referralCode !== tgt.referralCode) {
      risks.push(
        "Oba naloga imaju referral kod — zadržaće se keeper-ov, izvorni se odbacuje.",
      );
    }
  }

  return {
    allowed,
    reason,
    source: src.summary,
    target: tgt.summary,
    after,
    moves,
    risks,
  };
}
