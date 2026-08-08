import "server-only";

/**
 * Domenske reference na TenantUser koje merge premesta
 * (lib/users/mergeTenantUsers.ts) — isti spisak skeniraju provere
 * mergedReferences i invalidReferences. Ako merge dobije novu referencu,
 * dodati je i ovde (governing rule: rizičan workflow ↔ Diagnostic provera).
 */

import type { Model } from "mongoose";
import { Appointment } from "@/models/Appointment";
import { Voucher } from "@/models/Voucher";
import { Notification } from "@/models/Notification";
import { Testimonial } from "@/models/Testimonial";
import { AudienceContact } from "@/models/AudienceContact";
import { LoyaltyEvent } from "@/models/LoyaltyEvent";
import { LoyaltyLedger } from "@/models/LoyaltyLedger";
import { Referral } from "@/models/Referral";

export interface UserRefModel {
  /** Ljudska oznaka za evidence/poruke (naziv modela + polje kad nije očigledno). */
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>;
  field: string;
}

export const USER_REF_MODELS: readonly UserRefModel[] = [
  { label: "Appointment", model: Appointment, field: "clientProfileId" },
  { label: "Voucher(owner)", model: Voucher, field: "ownerTenantUserId" },
  { label: "Voucher(giftedBy)", model: Voucher, field: "giftedByTenantUserId" },
  { label: "Notification", model: Notification, field: "recipientProfileId" },
  { label: "Testimonial", model: Testimonial, field: "clientProfileId" },
  { label: "AudienceContact", model: AudienceContact, field: "profileId" },
  { label: "LoyaltyEvent", model: LoyaltyEvent, field: "subjectTenantUserId" },
  { label: "LoyaltyLedger", model: LoyaltyLedger, field: "tenantUserId" },
  { label: "Referral(referrer)", model: Referral, field: "referrerTenantUserId" },
  { label: "Referral(referred)", model: Referral, field: "referredTenantUserId" },
];
