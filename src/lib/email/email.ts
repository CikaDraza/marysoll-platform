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
  appointmentClientChangedAdminTemplate,
  appointmentCreatedAdminTemplate,
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
import { wrapEmailLayout, resolveSalon } from "@/lib/email/wrapEmailLayout";
import { Resend } from "resend";
import { resend } from "./resend";
import { resolveTenantNewsletterSender } from "@/lib/email/tenantEmailSettings";
import { platformOrigin } from "@/lib/platform/host-context";

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

async function resolveSalonEmailIdentity(
  tenantId: string | null | undefined,
  purpose: EmailPurpose,
): Promise<{ from?: string; replyTo?: string; useTenantClient: boolean }> {
  if (!tenantId) return { useTenantClient: false };
  try {
    await connectToDB();
    const profile = (await SalonProfile.findOne({
      tenantId: new Types.ObjectId(tenantId),
    })
      .select("name newsletterEmail contactEmail resendApiKey")
      .lean()) as {
      name?: string;
      newsletterEmail?: string;
      contactEmail?: string;
      resendApiKey?: string;
    } | null;

    const name = profile?.name ?? "";
    const replyTo = profile?.contactEmail || undefined;
    if (!profile?.resendApiKey) {
      return { replyTo, useTenantClient: false };
    }

    if (purpose === "newsletter" && profile?.newsletterEmail) {
      const tenant = (await Tenant.findById(tenantId)
        .select("customDomain customDomainVerified")
        .lean()) as {
        customDomain?: string;
        customDomainVerified?: boolean;
      } | null;
      const senderDomain = profile.newsletterEmail.split("@")[1]?.toLowerCase();
      const customDomain = tenant?.customDomain?.toLowerCase();

      if (
        customDomain &&
        senderDomain === customDomain &&
        !tenant?.customDomainVerified
      ) {
        return { replyTo, useTenantClient: false };
      }

      return {
        from: `"${name}" <${profile.newsletterEmail}>`,
        replyTo,
        useTenantClient: true,
      };
    }
    if (purpose === "notification" || purpose === "system") {
      const tenant = (await Tenant.findById(tenantId)
        .select("customDomain customDomainVerified")
        .lean()) as {
        customDomain?: string;
        customDomainVerified?: boolean;
      } | null;
      const verifiedDomain =
        tenant?.customDomain && tenant.customDomainVerified
          ? tenant.customDomain.toLowerCase()
          : null;

      if (purpose === "notification" && profile?.contactEmail) {
        const contactDomain =
          profile.contactEmail.split("@")[1]?.toLowerCase() ?? "";
        // Only use tenant Resend client if contactEmail is on the verified custom domain
        if (verifiedDomain && contactDomain === verifiedDomain) {
          return {
            from: `"${name}" <${profile.contactEmail}>`,
            replyTo,
            useTenantClient: true,
          };
        }
        // No verified domain match — fall back to platform client with replyTo
        return { replyTo, useTenantClient: false };
      }

      if (purpose === "system" && verifiedDomain) {
        return {
          from: `"${name}" <noreply@${verifiedDomain}>`,
          replyTo,
          useTenantClient: true,
        };
      }
    }
  } catch {
    // fall through to platform default
  }
  return { useTenantClient: false };
}

function tenantIdForIdentity(
  identity: { useTenantClient: boolean },
  tenantId: string | null,
) {
  return identity.useTenantClient ? tenantId : null;
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

  const client = await resolveResendClient(
    options.from && tenantId ? tenantId : null,
  );

  try {
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || htmlToText(html),
      replyTo: options.replyTo,
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
  const identity = await resolveSalonEmailIdentity(tenantId, "notification");
  return sendEmail({
    to,
    subject: subjects[type],
    html,
    from: identity.from,
    replyTo: identity.replyTo,
    tenantId: tenantIdForIdentity(identity, tenantId),
  });
}

export async function sendAppointmentCreatedAdminNotification(
  to: string | string[],
  data: AppointmentNotificationData,
): Promise<{ success: boolean; messageId?: string }> {
  const tenantId = data.tenantId?.toString() ?? null;
  const html = await appointmentCreatedAdminTemplate({ ...data, tenantId });
  const identity = await resolveSalonEmailIdentity(tenantId, "notification");

  return sendEmail({
    to,
    subject: `Novi termin čeka odobrenje — ${data.serviceName}`,
    html,
    from: identity.from,
    replyTo: identity.replyTo,
    tenantId: tenantIdForIdentity(identity, tenantId),
  });
}

export async function sendAppointmentClientChangeAdminNotification(
  to: string | string[],
  type: "rescheduled" | "cancelled",
  data: AppointmentNotificationData,
): Promise<{ success: boolean; messageId?: string }> {
  const tenantId = data.tenantId?.toString() ?? null;
  const html = await appointmentClientChangedAdminTemplate(
    { ...data, tenantId },
    type,
  );
  const identity = await resolveSalonEmailIdentity(tenantId, "notification");
  const subject =
    type === "cancelled"
      ? `Klijent je otkazao termin — ${data.serviceName}`
      : `Klijent je izmenio termin — ${data.serviceName}`;

  return sendEmail({
    to,
    subject,
    html,
    from: identity.from,
    replyTo: identity.replyTo,
    tenantId: tenantIdForIdentity(identity, tenantId),
  });
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
  const identity = await resolveSalonEmailIdentity(tenantId, "notification");
  return sendEmail({
    to,
    subject,
    html,
    from: identity.from,
    replyTo: identity.replyTo,
    tenantId: tenantIdForIdentity(identity, tenantId),
  });
}

// ── SuperAdmin ↔ Owner chat notifications ─────────────────────────────────────
function escapeEmailHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Email obaveštenje za poruku u chatu između Marysoll podrške (superadmin) i
 * vlasnika salona. Uvek Marysoll platform branding (nije salonski email).
 */
export async function sendSuperAdminChatNotification(
  to: string | string[],
  data: {
    /** Ime salona (za subjekt kad owner šalje superadminu). */
    salonName: string;
    /** Ko je poslao — npr. "Marysoll podrška" ili ime salona/vlasnika. */
    senderLabel: string;
    message: string;
    hasAttachment: boolean;
    /** true = poruku šalje superadmin owneru; false = owner šalje superadminu. */
    fromSuperAdmin: boolean;
    /** Apsolutni link ka chatu (opciono). */
    url?: string | null;
  },
): Promise<{ success: boolean; messageId?: string }> {
  const preview = data.message?.trim()
    ? data.message.trim()
    : data.hasAttachment
      ? "📎 Poslat je prilog"
      : "";

  const subject = data.fromSuperAdmin
    ? "💬 Nova poruka od Marysoll podrške"
    : `💬 Nova poruka od salona ${data.salonName}`;

  // Isti bulletproof šablon kao ctaButton u templates/: boja na <td> (bgcolor +
  // background-color) i padding na ćeliji — Outlook ne boji pouzdano inline <a>
  // niti mu primenjuje padding, pa bi belo na belom nestalo.
  const button = data.url
    ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
         <tr>
           <td align="center" bgcolor="#7c3aed" style="border-radius:8px;background-color:#7c3aed;padding:12px 24px;mso-padding-alt:12px 24px;">
             <a href="${data.url}" style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:600;">Otvori chat</a>
           </td>
         </tr>
       </table>`
    : "";

  const content = `
    <p style="font-size:16px;margin:0 0 12px;">Imate novu poruku u <strong>Marysoll</strong> chatu.</p>
    <div style="margin:16px 0;padding:14px 18px;background:#f5f3ff;border-radius:10px;border:1px solid #ede9fe;">
      <p style="margin:0 0 6px;font-weight:600;color:#5b21b6;">${escapeEmailHtml(data.senderLabel)}</p>
      <p style="margin:0;color:#374151;white-space:pre-wrap;">${escapeEmailHtml(preview)}</p>
    </div>
    ${button}
    <p style="font-size:12px;color:#9ca3af;margin-top:16px;">Odgovorite direktno u Marysoll chatu. Ovo je automatsko obaveštenje — ne odgovarajte na ovaj email.</p>
  `;

  const html = await wrapEmailLayout({ title: subject, content });
  return sendEmail({ to, subject, html });
}

// ── Tenant lifecycle ──────────────────────────────────────────────────────────

/**
 * Superadminu: neko je upravo registrovao salon i ČEKA aktivaciju domena.
 *
 * Namerno BEZ throttle-a — za razliku od chat poruka ovo je redak i vremenski
 * osetljiv događaj: dok niko ne reaguje, vlasnica sedi bez javnog sajta i nema
 * koga da pita.
 */
export async function sendTenantRegisteredNotification(
  to: string | string[],
  data: {
    salonName: string;
    ownerName: string;
    ownerEmail: string;
    subdomain: string;
    url?: string | null;
  },
): Promise<{ success: boolean; messageId?: string }> {
  const subject = `🆕 Nov salon čeka aktivaciju: ${data.salonName}`;

  const button = data.url
    ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
         <tr>
           <td align="center" bgcolor="#7c3aed" style="border-radius:8px;background-color:#7c3aed;padding:12px 24px;mso-padding-alt:12px 24px;">
             <a href="${data.url}" style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:600;">Otvori salone</a>
           </td>
         </tr>
       </table>`
    : "";

  const content = `
    <p style="font-size:16px;margin:0 0 12px;">Registrovan je nov salon i <strong>čeka aktivaciju</strong>.</p>
    <div style="margin:16px 0;padding:14px 18px;background:#f5f3ff;border-radius:10px;border:1px solid #ede9fe;">
      <p style="margin:0 0 6px;font-weight:600;color:#5b21b6;">${escapeEmailHtml(data.salonName)}</p>
      <p style="margin:0;color:#374151;line-height:1.9;">
        Vlasnica: <strong>${escapeEmailHtml(data.ownerName)}</strong><br>
        Email: ${escapeEmailHtml(data.ownerEmail)}<br>
        Subdomen: <strong>${escapeEmailHtml(data.subdomain)}</strong>
      </p>
    </div>
    <p style="font-size:14px;color:#374151;margin:0;">Salon već može da uređuje profil, usluge i termine. Javni sajt postaje vidljiv tek kada status pređe u <strong>Aktivan</strong>.</p>
    ${button}
    <p style="font-size:12px;color:#9ca3af;margin-top:16px;">Automatsko obaveštenje — ne odgovarajte na ovaj email.</p>
  `;

  const html = await wrapEmailLayout({ title: subject, content });
  return sendEmail({ to, subject, html });
}

/** Vlasnici: javni sajt je upravo postao vidljiv. */
export async function sendSalonActivatedNotification(
  to: string | string[],
  data: { salonName: string; siteUrl: string; dashboardUrl: string },
): Promise<{ success: boolean; messageId?: string }> {
  const subject = `🌐 Sajt salona ${data.salonName} je aktivan`;

  const content = `
    <p style="font-size:16px;margin:0 0 12px;">Javni sajt vašeg salona je od sada <strong>vidljiv posetiocima</strong>.</p>
    <div style="margin:16px 0;padding:14px 18px;background:#f0fdf4;border-radius:10px;border:1px solid #dcfce7;">
      <p style="margin:0 0 6px;font-weight:600;color:#166534;">${escapeEmailHtml(data.salonName)}</p>
      <p style="margin:0;color:#374151;">Adresa sajta: <strong>${escapeEmailHtml(data.siteUrl)}</strong></p>
    </div>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
      <tr>
        <td align="center" bgcolor="#7c3aed" style="border-radius:8px;background-color:#7c3aed;padding:12px 24px;mso-padding-alt:12px 24px;">
          <a href="${data.siteUrl}" style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:600;">Pogledajte sajt</a>
        </td>
      </tr>
    </table>
    <p style="font-size:14px;color:#374151;margin:12px 0 0;">Izgled sajta menjate u panelu, u delu za temu i sadržaj.</p>
    <p style="font-size:12px;color:#9ca3af;margin-top:16px;">Automatsko obaveštenje — ne odgovarajte na ovaj email.</p>
  `;

  const html = await wrapEmailLayout({ title: subject, content });
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
      const identity = await resolveSalonEmailIdentity(tenantId, "notification");
      return sendEmail({
        to,
        subject: `Hvala na recenziji! — ${data.serviceName}`,
        html,
        from: identity.from,
        replyTo: identity.replyTo,
        tenantId: tenantIdForIdentity(identity, tenantId),
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
      const identity = await resolveSalonEmailIdentity(tenantId, "notification");
      return sendEmail({
        to,
        subject: `Odgovor na vašu recenziju — ${data.serviceName}`,
        html,
        from: identity.from,
        replyTo: identity.replyTo,
        tenantId: tenantIdForIdentity(identity, tenantId),
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
      const identity = await resolveSalonEmailIdentity(tenantId, "notification");
      return sendEmail({
        to,
        subject: `Recenzija izmenjena — ${data.serviceName}`,
        html,
        from: identity.from,
        replyTo: identity.replyTo,
        tenantId: tenantIdForIdentity(identity, tenantId),
      });
    }

    case "deleted": {
      const html = await testimonialDeletedTemplate({
        clientName: data.clientName,
        serviceName: data.serviceName,
        comment: data.comment,
        tenantId,
      });
      const identity = await resolveSalonEmailIdentity(tenantId, "notification");
      return sendEmail({
        to,
        subject: `Recenzija obrisana — ${data.serviceName}`,
        html,
        from: identity.from,
        replyTo: identity.replyTo,
        tenantId: tenantIdForIdentity(identity, tenantId),
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
      const identity = await resolveSalonEmailIdentity(tenantId, "notification");
      return sendEmail({
        to,
        subject: `Sistemska poruka — ${data.serviceName}`,
        html,
        from: identity.from,
        replyTo: identity.replyTo,
        tenantId: tenantIdForIdentity(identity, tenantId),
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
  const resetUrl = `${platformOrigin()}/reset-password?token=${token}`;
  const html = await passwordResetTemplate({ name, resetUrl, tenantId });
  const identity = await resolveSalonEmailIdentity(tenantId, "system");
  await sendEmail({
    to: email,
    subject: `Resetovanje lozinke — ${name}`,
    html,
    from: identity.from,
    replyTo: identity.replyTo,
    tenantId: tenantIdForIdentity(identity, tenantId ?? null),
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

  const sender = await resolveTenantNewsletterSender(tenantId);

  const { data, error } = await sender.client.emails.send({
    from: sender.from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text: htmlToText(html),
    replyTo: sender.replyTo,
  });

  if (error) {
    console.error("❌ Resend newsletter error:", error);
    throw error;
  }

  return { success: true, messageId: data?.id };
}

/** Jedna poruka u newsletter batch-u — sadržaj je već personalizovan po primaocu. */
export interface NewsletterBatchMessage {
  to: string;
  subject: string;
  htmlContent: string;
  unsubscribeUrl: string;
  trackingData?: {
    campaignId: string;
    subscriberId: string;
    trackingPixelId?: string;
  };
}

/**
 * Šalje jedan chunk newsletter poruka kroz Resend batch API (jedan HTTP poziv
 * za sve primaoce u chunk-u), isti obrazac koji koristi `executeSend`.
 *
 * Slanje jedan-po-jedan je za kampanju od 50+ primalaca trajalo predugo da bi
 * stalo u životni vek serverless funkcije, pa bi se slanje prekidalo u pola.
 * Batch to svodi na jedan poziv po chunk-u.
 *
 * HTML se i dalje renderuje po primaocu (tracking pixel i unsubscribe link su
 * jedinstveni), ali se brending saluna razrešava jednom za ceo chunk.
 *
 * Chunk mora biti <= NEWSLETTER_BATCH_SIZE; pozivalac deli listu i upisuje
 * logove po chunk-u, da prekid usred slanja ne izgubi trag o već poslatom.
 */
export const NEWSLETTER_BATCH_SIZE = 50;

export async function sendNewsletterBatch(
  messages: NewsletterBatchMessage[],
  tenantId?: string | null,
): Promise<{ success: boolean; error?: unknown }> {
  if (messages.length === 0) return { success: true };

  const [sender, salon] = await Promise.all([
    resolveTenantNewsletterSender(tenantId),
    resolveSalon(tenantId),
  ]);

  const payload = await Promise.all(
    messages.map(async (m) => {
      const html = await newsletterPromotionTemplate({
        clientName: "Pretplatniče/Pretplatnice",
        subject: m.subject,
        content: m.htmlContent,
        unsubscribeUrl: m.unsubscribeUrl,
        trackingData: m.trackingData,
        tenantId,
        salon,
      });

      return {
        from: sender.from,
        to: m.to,
        subject: m.subject,
        html,
        text: htmlToText(html),
        replyTo: sender.replyTo,
      };
    }),
  );

  const { error } = await sender.client.batch.send(payload);

  if (error) {
    console.error("❌ Resend newsletter batch error:", error);
    return { success: false, error };
  }

  return { success: true };
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
  const verifyUrl = `${platformOrigin()}/api/newsletter/verify?token=${verificationToken}`;
  const html = await newsletterVerificationTemplate({ verifyUrl, tenantId });
  const sender = await resolveTenantNewsletterSender(tenantId);
  await sendEmail({
    from: sender.from,
    to: email,
    subject: "Potvrdite svoju pretplatu na newsletter",
    html,
    replyTo: sender.replyTo,
    tenantId: sender.usesTenantResend ? tenantId : null,
  });
}

