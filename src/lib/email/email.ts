import "server-only";

// lib/email.ts
import {
  AppointmentNotificationData,
  EmailOptions,
  TestimonialNotificationData,
} from "@/types";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { Tenant } from "@/models/Tenant";
import { Types } from "mongoose";
import {
  appointmentCreatedTemplate,
  appointmentApprovedTemplate,
  appointmentRejectedTemplate,
  appointmentRescheduledTemplate,
  appointmentCancelledTemplate,
  appointmentMessageTemplate,
} from "@/lib/email/templates/appointmentTemplates";
import {
  testimonialCreatedTemplate,
  testimonialRepliedTemplate,
  testimonialUpdatedTemplate,
  testimonialDeletedTemplate,
  testimonialMessageTemplate,
  passwordResetTemplate,
  newsletterVerificationTemplate,
  newsletterPromotionTemplate,
} from "@/lib/email/templates/otherTemplates";
import { wrapEmailLayout } from "@/lib/email/wrapEmailLayout";
import { Resend } from "resend";
import { resend } from "./resend";

// Helper: strip HTML tags to produce plain-text fallback
function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Resolve per-tenant Resend client (falls back to platform client) ──────────
async function resolveResendClient(
  tenantId: string | null | undefined,
): Promise<Resend> {
  if (!tenantId) return resend;
  try {
    await connectToDB();
    const profile = (await SalonProfile.findOne({
      tenantId: new Types.ObjectId(tenantId),
    })
      .select("resendApiKey")
      .lean()) as { resendApiKey?: string } | null;
    if (profile?.resendApiKey) return new Resend(profile.resendApiKey);
  } catch {
    // fall through to platform client
  }
  return resend;
}

// ── Resolve tenant-specific sender address ────────────────────────────────────
type EmailPurpose = "system" | "notification" | "newsletter";

async function resolveSalonFrom(
  tenantId: string | null | undefined,
  purpose: EmailPurpose,
): Promise<string | undefined> {
  if (!tenantId) return undefined;
  try {
    await connectToDB();
    const profile = (await SalonProfile.findOne({
      tenantId: new Types.ObjectId(tenantId),
    })
      .select("name newsletterEmail contactEmail")
      .lean()) as {
      name?: string;
      newsletterEmail?: string;
      contactEmail?: string;
    } | null;

    const name = profile?.name ?? "";

    if (purpose === "newsletter" && profile?.newsletterEmail) {
      return `"${name}" <${profile.newsletterEmail}>`;
    }
    if (purpose === "notification" && profile?.contactEmail) {
      return `"${name}" <${profile.contactEmail}>`;
    }
    if (purpose === "system") {
      const tenant = (await Tenant.findById(tenantId)
        .select("customDomain customDomainVerified")
        .lean()) as {
        customDomain?: string;
        customDomainVerified?: boolean;
      } | null;
      if (tenant?.customDomain && tenant.customDomainVerified) {
        return `"${name}" <noreply@${tenant.customDomain}>`;
      }
    }
  } catch {
    // fall through to platform default
  }
  return undefined;
}

// ── Core send function ────────────────────────────────────────────────────────
export async function sendEmail(
  options: EmailOptions,
): Promise<{ success: boolean; messageId?: string }> {
  const { to, subject, html, text, tenantId } = options;

  const fromEmail =
    options.from ||
    `"Marysoll small business platform" <${
      process.env.EMAIL_FROM || "onboarding@resend.dev"
    }>`;

  const client = await resolveResendClient(tenantId);

  try {
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || htmlToText(html),
    });

    if (error) {
      console.error("❌ Resend error:", error);
      throw error;
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error;
  }
}

// ── Appointment notifications ─────────────────────────────────────────────────
export async function sendAppointmentNotification(
  to: string | string[],
  type: "created" | "approved" | "rejected" | "rescheduled" | "cancelled",
  data: AppointmentNotificationData,
): Promise<{ success: boolean; messageId?: string }> {
  const subjects: Record<string, string> = {
    created: `Termin zakazan — ${data.serviceName}`,
    approved: `Termin potvrđen ✓ — ${data.serviceName}`,
    rejected: `Informacija o vašem terminu — ${data.serviceName}`,
    rescheduled: `Vaš termin je pomeren — ${data.serviceName}`,
    cancelled: `Termin otkazan — ${data.serviceName}`,
  };

  const tenantId = data.tenantId?.toString() ?? null;
  const templateFns: Record<string, () => Promise<string>> = {
    created: () => appointmentCreatedTemplate({ ...data, tenantId }),
    approved: () => appointmentApprovedTemplate({ ...data, tenantId }),
    rejected: () => appointmentRejectedTemplate({ ...data, tenantId }),
    rescheduled: () =>
      appointmentRescheduledTemplate({
        ...data,
        proposedDate: data.proposedDate ?? data.date,
        proposedTime: data.proposedTime ?? data.time,
        tenantId,
      }),
    cancelled: () => appointmentCancelledTemplate({ ...data, tenantId }),
  };

  const html = await templateFns[type]();
  const from = await resolveSalonFrom(tenantId, "notification");
  return sendEmail({ to, subject: subjects[type], html, from, tenantId });
}

export async function sendAppointmentMessageNotification(
  to: string | string[],
  data: {
    clientName: string;
    serviceName: string;
    date?: string;
    time?: string;
    appointmentId: string;
    senderName: string;
    message: string;
    isAdminSender: boolean;
    tenantId?: string | null;
  },
): Promise<{ success: boolean; messageId?: string }> {
  const subject = data.isAdminSender
    ? `Nova poruka od salona — ${data.serviceName}`
    : `Nova poruka od klijenta — ${data.serviceName}`;

  const tenantId = data.tenantId ?? null;
  const html = await appointmentMessageTemplate(data);
  const from = await resolveSalonFrom(tenantId, "notification");
  return sendEmail({ to, subject, html, from, tenantId });
}

// ── Testimonial notifications ─────────────────────────────────────────────────
export async function sendTestimonialNotification(
  to: string | string[],
  type: "created" | "replied" | "updated" | "deleted" | "message",
  data: TestimonialNotificationData,
): Promise<{ success: boolean; messageId?: string }> {
  const tenantId = data.tenantId ?? null;

  switch (type) {
    case "created": {
      const html = await testimonialCreatedTemplate({
        clientName: data.clientName,
        serviceName: data.serviceName,
        rating: data.rating ?? 5,
        comment: data.comment ?? "",
        adminReply: data.adminReply,
        tenantId,
      });
      const from = await resolveSalonFrom(tenantId, "notification");
      return sendEmail({
        to,
        subject: `Hvala na recenziji! — ${data.serviceName}`,
        html,
        from,
        tenantId,
      });
    }

    case "replied": {
      const html = await testimonialRepliedTemplate({
        clientName: data.clientName,
        serviceName: data.serviceName,
        rating: data.rating ?? 5,
        comment: data.comment ?? "",
        adminReply: data.adminReply ?? "",
        tenantId,
      });
      const from = await resolveSalonFrom(tenantId, "notification");
      return sendEmail({
        to,
        subject: `Odgovor na vašu recenziju — ${data.serviceName}`,
        html,
        from,
        tenantId,
      });
    }

    case "updated": {
      const html = await testimonialUpdatedTemplate({
        clientName: data.clientName,
        serviceName: data.serviceName,
        rating: data.rating ?? 5,
        comment: data.comment ?? "",
        tenantId,
      });
      const from = await resolveSalonFrom(tenantId, "notification");
      return sendEmail({
        to,
        subject: `Recenzija izmenjena — ${data.serviceName}`,
        html,
        from,
        tenantId,
      });
    }

    case "deleted": {
      const html = await testimonialDeletedTemplate({
        clientName: data.clientName,
        serviceName: data.serviceName,
        comment: data.comment,
        tenantId,
      });
      const from = await resolveSalonFrom(tenantId, "notification");
      return sendEmail({
        to,
        subject: `Recenzija obrisana — ${data.serviceName}`,
        html,
        from,
        tenantId,
      });
    }

    case "message": {
      const html = await testimonialMessageTemplate({
        clientName: data.clientName,
        serviceName: data.serviceName,
        rating: data.rating ?? 5,
        comment: data.comment,
        adminReply: data.adminReply,
        tenantId,
      });
      const from = await resolveSalonFrom(tenantId, "notification");
      return sendEmail({
        to,
        subject: `Sistemska poruka — ${data.serviceName}`,
        html,
        from,
        tenantId,
      });
    }
  }
}

// ── Password reset ────────────────────────────────────────────────────────────
export async function sendResetEmail(
  email: string,
  token: string,
  name = "korisniče",
  tenantId?: string | null,
): Promise<void> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  const html = await passwordResetTemplate({ name, resetUrl, tenantId });
  const from = await resolveSalonFrom(tenantId, "system");
  await sendEmail({
    to: email,
    subject: `Resetovanje lozinke — ${name}`,
    html,
    from,
    tenantId,
  });
}

export async function sendResetEmailOnAssistant(
  email: string,
  token: string,
  assistantSlug: string,
): Promise<void> {
  const ASSISTANT_URL = process.env.NEXT_ASSISTANT_URL;
  const resetUrl = `${ASSISTANT_URL}/${assistantSlug}?token=${token}`;
  const html = await passwordResetTemplate({ name: "korisniče", resetUrl });
  await sendEmail({
    from: `"Marysoll Makeup Salon" <${process.env.SYSTEM_FROM_EMAIL || process.env.EMAIL_FROM || "onboarding@resend.dev"}>`,
    to: email,
    subject: "Marysoll Makeup Salon — Resetovanje šifre",
    html,
  });
}

// ── Newsletter ────────────────────────────────────────────────────────────────

/**
 * Send a newsletter campaign email to a single subscriber.
 * Wraps content in the branded salon layout with unsubscribe footer.
 */
export async function sendNewsletterEmail(
  to: string | string[],
  subject: string,
  htmlContent: string,
  unsubscribeUrl: string,
  trackingData?: {
    campaignId: string;
    subscriberId: string;
    trackingPixelId?: string;
  },
  tenantId?: string | null,
): Promise<{ success: boolean; messageId?: string }> {
  const html = await newsletterPromotionTemplate({
    clientName: "Pretplatniče/Pretplatnice",
    subject,
    content: htmlContent,
    unsubscribeUrl,
    trackingData,
    tenantId,
  });

  const campaignFrom =
    (await resolveSalonFrom(tenantId, "newsletter")) ??
    `"Marysoll small business platform" <${process.env.NEWSLETTER_FROM_EMAIL || process.env.EMAIL_FROM}>`;

  return sendEmail({
    from: campaignFrom,
    to,
    subject,
    html,
    tenantId,
  });
}

/**
 * Send newsletter opt-in verification email.
 * Verify link always points to the platform API; the API then redirects to the
 * tenant's own domain after successful verification.
 */
export async function sendNewsletterVerificationEmail(
  email: string,
  verificationToken: string,
  tenantId?: string | null,
): Promise<void> {
  const platformUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const verifyUrl = `${platformUrl}/api/newsletter/verify?token=${verificationToken}`;
  const html = await newsletterVerificationTemplate({ verifyUrl, tenantId });
  const from =
    (await resolveSalonFrom(tenantId, "newsletter")) ??
    `"Marysoll" <${process.env.SYSTEM_FROM_EMAIL || process.env.EMAIL_FROM}>`;
  await sendEmail({
    from,
    to: email,
    subject: "Potvrdite svoju pretplatu na newsletter",
    html,
    tenantId,
  });
}

/**
 * Send email verification to a newly registered client.
 */
export async function sendRegisterVerificationEmail(
  email: string,
  verificationToken: string,
  clientName = "korisniče",
  tenantId?: string | null,
): Promise<void> {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}&type=client`;
  const { emailVerificationTemplate } =
    await import("@/lib/email/templates/otherTemplates");
  const html = await emailVerificationTemplate({
    clientName,
    verificationUrl: verifyUrl,
    ctaLabel: "Potvrdite email adresu →",
    tenantId,
  });
  const from = await resolveSalonFrom(tenantId, "system");
  await sendEmail({
    to: email,
    subject: "Potvrdite vašu email adresu",
    html,
    from,
    tenantId,
  });
}

// ── Generic branded email ─────────────────────────────────────────────────────

/**
 * Send a plain branded email using wrapEmailLayout.
 * Useful for one-off system messages.
 */
export async function sendBrandedEmail(options: {
  to: string | string[];
  subject: string;
  title: string;
  content: string;
  tenantId?: string | null;
  from?: string;
}): Promise<{ success: boolean; messageId?: string }> {
  const html = await wrapEmailLayout({
    title: options.title,
    content: options.content,
    tenantId: options.tenantId,
  });
  return sendEmail({ to: options.to, subject: options.subject, html, from: options.from });
}
