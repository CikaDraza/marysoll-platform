import "server-only";

// ─── Growth Studio: voucher lifecycle ─────────────────────────────────────────
// Sve tranzicije su CAS (findOneAndUpdate sa status uslovom) — od dva
// konkurentna zahteva tačno jedan prolazi, bez transakcija.

import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { Voucher } from "@/models/Voucher";
import {
  generateVoucherCode,
  VOUCHER_PREFIX_BY_ORIGIN,
} from "@/lib/platform/loyalty-client";
import type { VoucherType } from "../types";

export interface VoucherLean {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  code: string;
  type: VoucherType;
  value: number;
  serviceScope: Types.ObjectId[];
  serviceName?: string;
  origin: string;
  ownerTenantUserId: Types.ObjectId | null;
  giftedByTenantUserId?: Types.ObjectId | null;
  status: "active" | "reserved" | "redeemed" | "expired" | "revoked";
  reservedAppointmentId?: Types.ObjectId;
  expiresAt?: Date;
}

export interface IssueVoucherParams {
  tenantId: Types.ObjectId | string;
  ownerTenantUserId: Types.ObjectId | string | null;
  type: VoucherType;
  value: number;
  serviceScope?: (Types.ObjectId | string)[];
  serviceName?: string;
  origin: "auto_rule" | "manual" | "referral" | "gift" | "points_shop";
  expiresDays?: number;
  /** Klijent koji poklanja (share voucher / gift). Phase 2. */
  giftedByTenantUserId?: Types.ObjectId | string;
  issuedByRuleId?: string;
  issuedByAdminId?: Types.ObjectId | string;
  issuedForAppointmentId?: Types.ObjectId | string;
  issuedByEventId?: Types.ObjectId | string;
}

export async function issueVoucher(
  params: IssueVoucherParams,
): Promise<VoucherLean> {
  await connectToDB();

  const expiresAt = params.expiresDays
    ? new Date(Date.now() + params.expiresDays * 24 * 3_600_000)
    : undefined;

  const prefix = VOUCHER_PREFIX_BY_ORIGIN[params.origin];

  // Retry na koliziju koda (unique {tenantId, code}).
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateVoucherCode(prefix);
    try {
      const doc = await Voucher.create({
        tenantId: params.tenantId,
        code,
        type: params.type,
        value: params.value,
        serviceScope: params.serviceScope ?? [],
        serviceName: params.serviceName ?? "",
        origin: params.origin,
        ownerTenantUserId: params.ownerTenantUserId,
        giftedByTenantUserId: params.giftedByTenantUserId,
        status: "active",
        expiresAt,
        issuedByRuleId: params.issuedByRuleId,
        issuedByAdminId: params.issuedByAdminId,
        issuedForAppointmentId: params.issuedForAppointmentId,
        issuedByEventId: params.issuedByEventId,
      });
      return doc.toObject() as VoucherLean;
    } catch (err: unknown) {
      if ((err as { code?: number })?.code === 11000) continue;
      throw err;
    }
  }
  throw new Error("Neuspešno generisanje voucher koda posle 5 pokušaja");
}

/**
 * Rezerviše vaučer pri bookingu. Prolazi samo ako je aktivan, nije istekao
 * i pripada klijentu (ili je nepreuzet poklon). Od dva konkurentna bookinga
 * istim kodom tačno jedan dobija rezervaciju.
 */
export async function reserveVoucherForBooking(params: {
  tenantId: Types.ObjectId | string;
  code: string;
  clientTenantUserId: Types.ObjectId | string;
  appointmentId?: Types.ObjectId | string;
}): Promise<VoucherLean | null> {
  await connectToDB();
  const now = new Date();
  return Voucher.findOneAndUpdate(
    {
      tenantId: params.tenantId,
      code: params.code.trim().toUpperCase(),
      status: "active",
      $and: [
        {
          $or: [
            { ownerTenantUserId: params.clientTenantUserId },
            {
              ownerTenantUserId: null,
              giftedByTenantUserId: { $ne: params.clientTenantUserId },
            },
          ],
        },
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      ],
    },
    {
      $set: {
        status: "reserved",
        reservedAppointmentId: params.appointmentId ?? null,
        // Nepreuzet poklon se pri korišćenju vezuje za klijenta
        ownerTenantUserId: params.clientTenantUserId,
      },
    },
    { new: true },
  ).lean<VoucherLean>();
}

/** Naknadno veže rezervaciju za kreiran termin (kod reserve-pre-create toka). */
export async function attachReservationToAppointment(
  voucherId: Types.ObjectId | string,
  appointmentId: Types.ObjectId | string,
): Promise<void> {
  await connectToDB();
  await Voucher.findOneAndUpdate(
    { _id: voucherId, status: "reserved" },
    { $set: { reservedAppointmentId: appointmentId } },
  );
}

/** Completion termina: reserved → redeemed. */
export async function redeemForAppointment(
  appointmentId: Types.ObjectId | string,
): Promise<VoucherLean | null> {
  await connectToDB();
  return Voucher.findOneAndUpdate(
    { reservedAppointmentId: appointmentId, status: "reserved" },
    {
      $set: {
        status: "redeemed",
        redeemedAt: new Date(),
        redeemedAppointmentId: appointmentId,
      },
    },
    { new: true },
  ).lean<VoucherLean>();
}

/** Otkazivanje/odbijanje/no-show: reserved → active (vaučer se vraća klijentu). */
export async function releaseForAppointment(
  appointmentId: Types.ObjectId | string,
): Promise<VoucherLean | null> {
  await connectToDB();
  return Voucher.findOneAndUpdate(
    { reservedAppointmentId: appointmentId, status: "reserved" },
    { $set: { status: "active", reservedAppointmentId: null } },
    { new: true },
  ).lean<VoucherLean>();
}

/** Revert completion-a: redeemed → reserved ili active (zavisno od novog statusa). */
export async function unRedeemForAppointment(
  appointmentId: Types.ObjectId | string,
  backTo: "reserved" | "active",
): Promise<VoucherLean | null> {
  await connectToDB();
  return Voucher.findOneAndUpdate(
    { redeemedAppointmentId: appointmentId, status: "redeemed" },
    {
      $set: {
        status: backTo,
        redeemedAt: null,
        redeemedAppointmentId: null,
        reservedAppointmentId: backTo === "reserved" ? appointmentId : null,
      },
    },
    { new: true },
  ).lean<VoucherLean>();
}

/**
 * Revert completion-a: povuci vaučere IZDATE iz tog completion-a (milestone
 * nagrada) ako još nisu iskorišćeni. Već iskorišćen vaučer se ne dira.
 */
export async function revokeVouchersIssuedForAppointment(
  appointmentId: Types.ObjectId | string,
): Promise<number> {
  await connectToDB();
  const res = await Voucher.updateMany(
    {
      issuedForAppointmentId: appointmentId,
      status: { $in: ["active", "reserved"] },
    },
    { $set: { status: "revoked" } },
  );
  return res.modifiedCount ?? 0;
}

/** Cron: aktivni vaučeri kojima je istekao rok → expired. */
export async function expireDueVouchers(): Promise<number> {
  await connectToDB();
  const res = await Voucher.updateMany(
    { status: "active", expiresAt: { $ne: null, $lt: new Date() } },
    { $set: { status: "expired" } },
  );
  return res.modifiedCount ?? 0;
}

export { computeVoucherDiscount } from "@/lib/platform/loyalty-client";
