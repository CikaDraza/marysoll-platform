import "server-only";
import { Types } from "mongoose";

import { Tenant } from "@/models/Tenant";
import { TenantUser } from "@/models/TenantUser";
import { AuthUser } from "@/models/AuthUser";
import { SalonProfile } from "@/models/SalonProfile";
import { Subscription } from "@/models/Subscription";
import { Service } from "@/models/Service";
import { Appointment } from "@/models/Appointment";
import { Testimonial } from "@/models/Testimonial";
import { Notification } from "@/models/Notification";
import { AudienceContact } from "@/models/AudienceContact";
import { AudienceSegment } from "@/models/AudienceSegment";
import { EmailCampaign } from "@/models/EmailCampaign";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { NewsletterTemplate } from "@/models/NewsletterTemplate";
import { NewsletterLog } from "@/models/NewsletterLog";
import { CampaignEvent } from "@/models/CampaignEvent";
import { CampaignAnalytics } from "@/models/CampaignAnalytics";
import { SeoMeta } from "@/models/SeoMeta";
import { LoyaltyAccount } from "@/models/LoyaltyAccount";
import { LoyaltyConfig } from "@/models/LoyaltyConfig";
import { LoyaltyEvent } from "@/models/LoyaltyEvent";
import { LoyaltyLedger } from "@/models/LoyaltyLedger";
import { Voucher } from "@/models/Voucher";
import { Referral } from "@/models/Referral";
import { SalonInternalChat } from "@/models/SalonInternalChat";
import { SuperAdminChat } from "@/models/SuperAdminChat";
import { deleteTenantBookingData } from "@/lib/tenant/bookingCascade";
import { cancelPaddleSubscription } from "@/lib/paddle";

/**
 * Trajno brisanje salona — JEDINA destruktivna owner akcija.
 *
 * Jedan canonical cascade za obe rute (owner self-delete i superadmin), jer su
 * dve ručne liste već razišle: owner varijanta nije brisala Loyalty, Voucher,
 * Referral, oba chata, NewsletterLog, CampaignEvent, CampaignAnalytics ni
 * SeoMeta. Svaka nova tenant-scoped kolekcija dodaje se OVDE i time važi za obe
 * rute; `tenantScopedCascade()` je ujedno i spisak koji test proverava.
 *
 * `Category` NIJE ovde: to je platformska taksonomija bez `tenantId`. Ranija
 * superadmin lista je imala `Category.deleteMany({ tenantId })` — danas no-op,
 * ali bi uz `strictQuery: true` obrisala celu globalnu taksonomiju.
 */

export type TenantDeletionErrorCode =
  | "TENANT_NOT_FOUND"
  | "TENANT_OWNERSHIP_INTEGRITY_ERROR"
  | "TENANT_BILLING_CANCELLATION_FAILED"
  | "TENANT_OWNER_ACCOUNT_IN_USE";

export class TenantDeletionError extends Error {
  constructor(
    readonly code: TenantDeletionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TenantDeletionError";
  }
}

/** Kolekcije koje se brišu po `tenantId`. Slot ide preko `salonId` (booking cascade). */
function tenantScopedModels() {
  return [
    ["TenantUser", TenantUser],
    ["SalonProfile", SalonProfile],
    ["Subscription", Subscription],
    ["Service", Service],
    ["Appointment", Appointment],
    ["Testimonial", Testimonial],
    ["Notification", Notification],
    ["AudienceContact", AudienceContact],
    ["AudienceSegment", AudienceSegment],
    ["EmailCampaign", EmailCampaign],
    ["NewsletterCampaign", NewsletterCampaign],
    ["NewsletterTemplate", NewsletterTemplate],
    ["NewsletterLog", NewsletterLog],
    ["CampaignEvent", CampaignEvent],
    ["CampaignAnalytics", CampaignAnalytics],
    ["SeoMeta", SeoMeta],
    ["LoyaltyAccount", LoyaltyAccount],
    ["LoyaltyConfig", LoyaltyConfig],
    ["LoyaltyEvent", LoyaltyEvent],
    ["LoyaltyLedger", LoyaltyLedger],
    ["Voucher", Voucher],
    ["Referral", Referral],
    ["SalonInternalChat", SalonInternalChat],
    ["SuperAdminChat", SuperAdminChat],
  ] as const;
}

/** Imena kolekcija u canonical cascade-u — ugovor koji test zaključava. */
export const TENANT_SCOPED_CASCADE: readonly string[] =
  tenantScopedModels().map(([name]) => name);

export interface TenantDeletionResult {
  deletedCounts: Record<string, number>;
  removedAuthUserIds: string[];
  keptAuthUserIds: string[];
  paddleCancelled: boolean;
}

/**
 * Zaustavlja buduću naplatu PRE bilo kakvog brisanja.
 *
 * Lokalni `Subscription.deleteMany` nije dovoljan: zapis bi nestao, a Paddle
 * bi nastavio da naplaćuje. Ako otkazivanje ne uspe, ništa se ne briše.
 */
async function stopFutureBilling(tenantId: string): Promise<boolean> {
  const subs = (await Subscription.find({
    tenantId,
    status: { $in: ["active", "past_due"] },
  })
    .select("billingProvider paddleSubscriptionId")
    .lean()) as unknown as {
    billingProvider?: string;
    paddleSubscriptionId?: string | null;
  }[];

  const paddleSubs = subs.filter(
    (s) => s.billingProvider === "paddle" && s.paddleSubscriptionId,
  );
  if (paddleSubs.length === 0) return false;

  for (const sub of paddleSubs) {
    try {
      await cancelPaddleSubscription(sub.paddleSubscriptionId as string, "immediately");
    } catch (error) {
      throw new TenantDeletionError(
        "TENANT_BILLING_CANCELLATION_FAILED",
        `Otkazivanje pretplate kod Paddle-a nije uspelo (${
          error instanceof Error ? error.message : "nepoznata greška"
        }). Salon nije obrisan.`,
      );
    }
  }
  return true;
}

/**
 * Briše ceo tenant boundary. Pozivalac je već obavio svoje authorization i
 * business gate-ove (npr. superadmin zabranu brisanja salona u pretplati).
 */
export async function deleteTenantPermanently(input: {
  tenantId: string;
  /** Kada je zadat, mora se poklapati sa `Tenant.ownerId` (owner self-delete). */
  expectedOwnerAuthUserId?: string | null;
}): Promise<TenantDeletionResult> {
  const { tenantId } = input;

  // `tenantId` je tvrd uslov — bez njega nema nijednog delete-a.
  if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
    throw new TenantDeletionError(
      "TENANT_OWNERSHIP_INTEGRITY_ERROR",
      "tenantId nije validan — brisanje se ne izvršava.",
    );
  }

  const tenant = await Tenant.findById(tenantId).select("ownerId").lean<{
    _id: Types.ObjectId;
    ownerId?: Types.ObjectId | null;
  } | null>();
  if (!tenant) {
    throw new TenantDeletionError("TENANT_NOT_FOUND", "Salon nije pronađen.");
  }

  // ── Ownership invariant ───────────────────────────────────────────────────
  // Bez self-heal-a i bez traženja naloga po emailu: ako se ne poklapa, ovo je
  // integrity incident za superadmina, ne korisnički tok.
  const ownerMemberships = (await TenantUser.find({ tenantId, role: "OWNER" })
    .select("authUserId")
    .lean()) as unknown as {
    _id: Types.ObjectId;
    authUserId?: Types.ObjectId | null;
  }[];

  if (!tenant.ownerId) {
    throw new TenantDeletionError(
      "TENANT_OWNERSHIP_INTEGRITY_ERROR",
      "Salon nema vlasnika (Tenant.ownerId). Potrebna je superadmin intervencija.",
    );
  }
  if (ownerMemberships.length !== 1) {
    throw new TenantDeletionError(
      "TENANT_OWNERSHIP_INTEGRITY_ERROR",
      `Salon mora imati tačno jedan OWNER nalog, pronađeno: ${ownerMemberships.length}.`,
    );
  }
  const ownerMembership = ownerMemberships[0];
  if (!ownerMembership.authUserId) {
    throw new TenantDeletionError(
      "TENANT_OWNERSHIP_INTEGRITY_ERROR",
      "OWNER nalog nije povezan sa platformskim identitetom.",
    );
  }
  if (String(ownerMembership.authUserId) !== String(tenant.ownerId)) {
    throw new TenantDeletionError(
      "TENANT_OWNERSHIP_INTEGRITY_ERROR",
      "Tenant.ownerId i OWNER nalog pokazuju na različite identitete.",
    );
  }
  if (
    input.expectedOwnerAuthUserId &&
    String(input.expectedOwnerAuthUserId) !== String(tenant.ownerId)
  ) {
    throw new TenantDeletionError(
      "TENANT_OWNERSHIP_INTEGRITY_ERROR",
      "Pozivalac nije vlasnik ovog salona.",
    );
  }

  // ── Naplata pre brisanja ──────────────────────────────────────────────────
  const paddleCancelled = await stopFutureBilling(tenantId);

  // ── Identiteti: odluči PRE nego što članstva nestanu ──────────────────────
  const managementMemberships = (await TenantUser.find({
    tenantId,
    role: { $in: ["OWNER", "ADMIN", "STAFF"] },
    authUserId: { $ne: null },
  })
    .select("authUserId role")
    .lean()) as unknown as { authUserId: Types.ObjectId; role: string }[];

  const removedAuthUserIds: string[] = [];
  const keptAuthUserIds: string[] = [];

  for (const membership of managementMemberships) {
    const authUserId = membership.authUserId;

    const account = (await AuthUser.findById(authUserId)
      .select("platformRole")
      .lean()) as { platformRole?: string } | null;
    if (!account) continue;

    // SUPER_ADMIN nikada nije pogođen brisanjem salona.
    if (account.platformRole === "SUPER_ADMIN") {
      keptAuthUserIds.push(String(authUserId));
      continue;
    }

    // Vlasnik drugog salona → legitimno korišćen drugde.
    const ownsAnotherTenant = await Tenant.exists({
      ownerId: authUserId,
      _id: { $ne: tenant._id },
    });
    // Član drugog salona → isto.
    const memberElsewhere = await TenantUser.exists({
      authUserId,
      tenantId: { $ne: tenant._id },
    });

    if (ownsAnotherTenant || memberElsewhere) {
      if (membership.role === "OWNER") {
        // Vlasnik ovog salona ne sme biti vezan za drugo stanje koje bi
        // brisanje oštetilo — stani pre nego što bilo šta nestane.
        throw new TenantDeletionError(
          "TENANT_OWNER_ACCOUNT_IN_USE",
          "Vlasnički nalog je vezan i za drugi salon. Potrebna je superadmin intervencija.",
        );
      }
      keptAuthUserIds.push(String(authUserId));
      continue;
    }

    removedAuthUserIds.push(String(authUserId));
  }

  // ── Cascade ───────────────────────────────────────────────────────────────
  const deletedCounts: Record<string, number> = {};

  const booking = await deleteTenantBookingData(tenantId);
  deletedCounts.Slot = booking.slots;
  deletedCounts.BookingReservation = booking.reservations;
  deletedCounts.BookingDayLock = booking.dayLocks;
  deletedCounts.BookingOperationReceipt = booking.receipts;
  deletedCounts.BookingOutboxEvent = booking.outboxEvents;

  for (const [name, model] of tenantScopedModels()) {
    const result = await (
      model as unknown as {
        deleteMany(filter: Record<string, unknown>): Promise<{ deletedCount?: number }>;
      }
    ).deleteMany({ tenantId });
    deletedCounts[name] = result.deletedCount ?? 0;
  }

  await Tenant.findByIdAndDelete(tenantId);

  for (const authUserId of removedAuthUserIds) {
    await AuthUser.findByIdAndDelete(authUserId);
  }

  return { deletedCounts, removedAuthUserIds, keptAuthUserIds, paddleCancelled };
}
