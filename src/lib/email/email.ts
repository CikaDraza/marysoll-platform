import "server-only";

// lib/email.ts
import {
  AppointmentNotificationData,
  EmailOptions,
  TestimonialNotificationData,
} from "@/types";
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
import { resend } from "./resend";

// Helper: strip HTML tags to produce plain-text fallback
function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Core send function ────────────────────────────────────────────────────────
export async function sendEmail(
  options: EmailOptions,
): Promise<{ success: boolean; messageId?: string }> {
  const { to, subject, html, text } = options;

  const fromEmail =
    options.from ||
    `"Marysoll small business platform" <${
      process.env.EMAIL_FROM || "onboarding@resend.dev"
    }>`;

  try {
    const { data, error } = await resend.emails.send({
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
  return sendEmail({ to, subject: subjects[type], html });
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

  const html = await appointmentMessageTemplate(data);
  return sendEmail({ to, subject, html });
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
      return sendEmail({
        to,
        subject: `Hvala na recenziji! — ${data.serviceName}`,
        html,
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
      return sendEmail({
        to,
        subject: `Odgovor na vašu recenziju — ${data.serviceName}`,
        html,
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
      return sendEmail({
        to,
        subject: `Recenzija izmenjena — ${data.serviceName}`,
        html,
      });
    }

    case "deleted": {
      const html = await testimonialDeletedTemplate({
        clientName: data.clientName,
        serviceName: data.serviceName,
        comment: data.comment,
        tenantId,
      });
      return sendEmail({
        to,
        subject: `Recenzija obrisana — ${data.serviceName}`,
        html,
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
      return sendEmail({
        to,
        subject: `Sistemska poruka — ${data.serviceName}`,
        html,
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
  await sendEmail({
    to: email,
    subject: `Resetovanje lozinke — ${name}`,
    html,
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
  trackingData?: { campaignId: string; subscriberId: string },
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

  const { data, error } = await resend.emails.send({
    from: `"Marysoll small business platform" <${
      process.env.NEWSLETTER_FROM_EMAIL || "onboarding@resend.dev"
    }>`,
    replyTo: process.env.SUPPORT_FROM_EMAIL,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text: htmlToText(html),
  });

  if (error) {
    console.error("Greška pri slanju newslettera:", error);
    throw error;
  }

  return { success: true, messageId: data?.id };
}

/**
 * Send newsletter opt-in verification email.
 */
export async function sendNewsletterVerificationEmail(
  email: string,
  verificationToken: string,
  tenantId?: string | null,
): Promise<void> {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/newsletter/verify?token=${verificationToken}`;
  const html = await newsletterVerificationTemplate({ verifyUrl, tenantId });
  await sendEmail({
    to: email,
    subject: "Potvrdite svoju pretplatu na newsletter",
    html,
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
  await sendEmail({
    to: email,
    subject: "Potvrdite vašu email adresu",
    html,
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
