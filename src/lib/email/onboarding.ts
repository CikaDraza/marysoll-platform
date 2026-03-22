import "server-only";
/**
 * lib/email/onboarding.ts
 *
 * Onboarding email functions.
 * Uses production branded templates (wrapEmailLayout).
 */

import { sendEmail } from "./email";
import {
  ownerVerificationTemplate,
  ownerWelcomeTemplate,
  clientVerificationTemplate,
  clientWelcomeTemplate,
} from "./templates/otherTemplates";

export const TRIAL_DAYS = parseInt(process.env.DEFAULT_TRIAL_DAYS ?? "30");

const FROM_PLATFORM = `"Marysoll" <${process.env.EMAIL_FROM ?? "noreply@marysoll.com"}>`;

// ── Vlasnik salona ─────────────────────────────────────────────────────────────

export async function sendOwnerVerificationEmail(params: {
  email: string;
  ownerName: string;
  salonName: string;
  verificationToken: string;
  subdomain: string;
}): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify-email?token=${params.verificationToken}&type=owner`;

  const html = await ownerVerificationTemplate({
    ownerName: params.ownerName,
    salonName: params.salonName,
    verifyUrl,
    subdomain: params.subdomain,
    trialDays: TRIAL_DAYS,
  });

  await sendEmail({
    from: FROM_PLATFORM,
    to: params.email,
    subject: `Potvrdite email za salon "${params.salonName}" — Marysoll`,
    html,
  });
}

export async function sendOwnerWelcomeEmail(params: {
  email: string;
  ownerName: string;
  salonName: string;
  subdomain: string;
  trialEndsAt: Date;
}): Promise<void> {
  const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const trialEndsFormatted = params.trialEndsAt.toLocaleDateString("sr-RS", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const html = await ownerWelcomeTemplate({
    ownerName: params.ownerName,
    salonName: params.salonName,
    subdomain: params.subdomain,
    dashboardUrl: `${dashboardUrl}/dashboard`,
    trialDays: TRIAL_DAYS,
    trialEndsAt: trialEndsFormatted,
  });

  await sendEmail({
    from: FROM_PLATFORM,
    to: params.email,
    subject: `Salon aktiviran — počinje ${TRIAL_DAYS}-dnevni probni period 🎉`,
    html,
  });
}

// ── Klijent salona ─────────────────────────────────────────────────────────────

export async function sendClientVerificationEmail(params: {
  email: string;
  clientName: string;
  salonName: string;
  verificationToken: string;
  salonBaseUrl: string;
}): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify-email?token=${params.verificationToken}&type=client`;

  const html = await clientVerificationTemplate({
    clientName: params.clientName,
    salonName: params.salonName,
    verifyUrl,
  });

  await sendEmail({
    from: `"${params.salonName}" <${process.env.EMAIL_FROM ?? "noreply@marysoll.com"}>`,
    to: params.email,
    subject: `Potvrdite email za ${params.salonName}`,
    html,
  });
}

export async function sendClientWelcomeEmail(params: {
  email: string;
  clientName: string;
  salonName: string;
  salonUrl: string;
}): Promise<void> {
  const html = await clientWelcomeTemplate({
    clientName: params.clientName,
    salonName: params.salonName,
    salonUrl: params.salonUrl,
  });

  await sendEmail({
    from: `"${params.salonName}" <${process.env.EMAIL_FROM ?? "noreply@marysoll.com"}>`,
    to: params.email,
    subject: `Dobrodošli u ${params.salonName}! 🎉`,
    html,
  });
}
