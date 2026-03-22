import "server-only";

// lib/email.ts
import {
  AppointmentNotificationData,
  EmailOptions,
  SalonProfileData,
  TestimonialNotificationData,
} from "@/types";
import { SalonProfile } from "@/models/SalonProfile";
import {
  appointmentCreatedTemplate,
  appointmentApprovedTemplate,
  appointmentRejectedTemplate,
  appointmentRescheduledTemplate,
  appointmentCancelledTemplate,
} from "@/lib/email/templates/appointmentTemplates";
import {
  testimonialCreatedTemplate,
  passwordResetTemplate,
} from "@/lib/email/templates/otherTemplates";
import { resend } from "./resend";
import { connectToDB } from "../db/mongodb";

// SMTP konfiguracija
// const transporter = nodemailer.createTransport({
//   host: process.env.EMAIL_SERVER,
//   port: parseInt(process.env.EMAIL_PORT || "465"),
//   secure: true,
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASSWORD,
//   },
// });

// Test konekcije samo u razvojnom okruženju
// if (process.env.NODE_ENV === "development") {
//   transporter.verify((error: Error | null) => {
//     if (error) {
//       console.error("❌ SMTP connection failed:", error.message);
//     } else {
//       console.log("✅ SMTP server connected successfully");
//     }
//   });
// }

// Helper funkcija za konverziju HTML u text
function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function translateAppointmentStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "Na čekanju",
    appointment_approved: "Odobren",
    appointment_rejected: "Odbijen",
    appointment_rescheduled: "Ponovo zakazan",
    appointment_cancelled: "Otkazan",
    appointment_completed: "Završen",
    no_show: "Nije se pojavio",
  };

  return statusMap[status] || status;
}

// Funkcija za ekstrakciju i prevodenje statusa iz adminNote
function translateAdminNote(adminNote?: string): string {
  if (!adminNote) return "";

  // Proveri da li adminNote sadrži status
  const statusMatch = adminNote.match(
    /(pending|appointment_approved|appointment_rejected|appointment_rescheduled|appointment_cancelled|appointment_completed|no_show)/,
  );
  if (statusMatch) {
    const status = statusMatch[0];
    const translatedStatus = translateAppointmentStatus(status);
    return `Status termina je promenjen u: ${translatedStatus}`;
  }

  // Ako nije status, vrati originalnu poruku
  return adminNote;
}

// Generička metoda za slanje email-a
export async function sendEmail(
  options: EmailOptions,
): Promise<{ success: boolean; messageId?: string }> {
  const { to, subject, html, text } = options;

  const fromEmail =
    options.from ||
    `"Marysoll Makeup Salon" <${
      process.env.SALON_FROM_EMAIL || "onboarding@resend.dev"
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

// Template za appointment notifikacije
export async function sendAppointmentNotification(
  to: string | string[],
  type: "created" | "approved" | "rejected" | "rescheduled" | "cancelled",
  data: AppointmentNotificationData,
): Promise<{ success: boolean; messageId?: string }> {
  // Use branded templates with salon layout
  const subjects: Record<string, string> = {
    created:    `Termin zakazan — ${data.serviceName}`,
    approved:   `Termin potvrđen ✓ — ${data.serviceName}`,
    rejected:   `Informacija o vašem terminu — ${data.serviceName}`,
    rescheduled:`Vaš termin je pomeren — ${data.serviceName}`,
    cancelled:  `Termin otkazan — ${data.serviceName}`,
  };

  const templateFns: Record<string, () => Promise<string>> = {
    created:     () => appointmentCreatedTemplate(data),
    approved:    () => appointmentApprovedTemplate(data),
    rejected:    () => appointmentRejectedTemplate(data),
    rescheduled: () => appointmentRescheduledTemplate({
      ...data,
      // Fall back to original date/time if proposedDate/proposedTime not set
      proposedDate: data.proposedDate ?? data.date,
      proposedTime: data.proposedTime ?? data.time,
    }),
    cancelled:   () => appointmentCancelledTemplate(data),
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
  },
): Promise<{ success: boolean; messageId?: string }> {
  const subject = data.isAdminSender
    ? `Nova poruka od salona - ${data.serviceName}`
    : `Nova poruka od klijenta - ${data.serviceName}`;

  return sendEmail({
    to,
    subject,
    html: getAppointmentMessageHtml(data),
  });
}

// HTML template funkcije
function getAppointmentCreatedHtml(data: AppointmentNotificationData): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    "http://localhost:3000";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #BA34B7; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
        .info { margin: 15px 0; }
        .label { font-weight: bold; color: #5D0156; }
        .button { 
          display: inline-block; 
          padding: 10px 20px; 
          background: #BA34B7; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px; 
          margin-top: 20px;
        }
        a.button { color: #fff; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Marysoll Makeup</h1>
          <h2>Novi termin zakazan</h2>
        </div>
        <div class="content">
          <p>Poštovani/a,</p>
          <p>Novi termin je uspešno zakazan i čeka odobrenje.</p>
          
          <div class="info">
            <p><span class="label">Klijent:</span> ${data.clientName}</p>
            <p><span class="label">Usluga:</span> ${data.serviceName}</p>
            <p><span class="label">Datum:</span> ${data.date}</p>
            <p><span class="label">Vreme:</span> ${data.time}</p>
            ${
              data.note
                ? `<p><span class="label">Napomena:</span> ${data.note}</p>`
                : ""
            }
          </div>
          
          <p>Termin možete pregledati i odobriti u admin panelu:</p>
          <a href="${baseUrl}/dashboard?tab=Svi Termini" class="button">
            Pregledaj termin
          </a>
          
          <div class="footer">
            <p>Ovo je automatska poruka, molimo ne odgovarajte na ovaj email.</p>
            <p>© ${new Date().getFullYear()} Marysoll Makeup. Sva prava zadržana.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getAppointmentApprovedHtml(data: AppointmentNotificationData): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    "http://localhost:3000";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #BA34B7; color: white; padding: 20px; text-align: center; }
        .header-badge { color: white; padding: 5px 10px; border-radius: 5px; display: inline-block; margin: 10px 0; }
        .approved { background-color: #4BB543; font-weight: bold; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
        .info { margin: 15px 0; }
        .label { font-weight: bold; color: #5D0156; }
        .button { 
          display: inline-block; 
          padding: 10px 20px; 
          background: #BA34B7; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px; 
          margin-top: 20px;
        }
        a.button { color: #fff; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Marysoll Makeup</h1>
          </div>
          <div class="content">
          <h2 class="header-badge approved">Termin odobren ✓</h2>
          <p>Poštovani/a ${data.clientName},</p>
          <p>Vaš termin je uspešno odobren!</p>
          
          <div class="info">
            <p><span class="label">Usluga:</span> ${data.serviceName}</p>
            <p><span class="label">Datum:</span> ${data.date}</p>
            <p><span class="label">Vreme:</span> ${data.time}</p>
            ${
              data.adminNote
                ? `<p><span class="label">Napomena salona:</span> ${translateAdminNote(
                    data.adminNote,
                  )}</p>`
                : ""
            }
          </div>
          
          <p>Termin možete pregledati u vašem profilu:</p>
          <a href="${baseUrl}/dashboard?tab=Moji Termini" class="button">
            Pregledaj moje termine
          </a>
          
          <p><strong>Molimo Vas da budete tačni u zakazanom terminu.</strong></p>
          
          <div class="footer">
            <p>Ovo je automatska poruka, molimo ne odgovarajte na ovaj email.</p>
            <p>© ${new Date().getFullYear()} Marysoll Makeup. Sva prava zadržana.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getAppointmentRejectedHtml(data: AppointmentNotificationData): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    "http://localhost:3000";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #BA34B7; color: white; padding: 20px; text-align: center; }
        .header-badge { color: white; padding: 5px 10px; border-radius: 5px; display: inline-block; margin: 10px 0; }
        .rejected { background-color: #E53935; font-weight: bold; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
        .info { margin: 15px 0; }
        .label { font-weight: bold; color: #5D0156; }
        .button { 
          display: inline-block; 
          padding: 10px 20px; 
          background: #BA34B7; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px; 
          margin-top: 20px;
        }
        a.button { color: #fff; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Marysoll Makeup</h1>
          </div>
          <div class="content">
          <h2 class="header-badge rejected">Termin odbijen ✗</h2>
          <p>Poštovani/a ${data.clientName},</p>
          <p>Vaš termin je odbijen! Molimo vas zakazite drugi termin.</p>
          
          <div class="info">
            <p><span class="label">Usluga:</span> ${data.serviceName}</p>
            <p><span class="label">Datum:</span> ${data.date}</p>
            <p><span class="label">Vreme:</span> ${data.time}</p>
            ${
              data.adminNote
                ? `<p><span class="label">Napomena salona:</span> ${translateAdminNote(
                    data.adminNote,
                  )}</p>`
                : ""
            }
          </div>
          
          <p>Termin možete pregledati u vašem profilu:</p>
          <a href="${baseUrl}/dashboard?tab=Moji Termini" class="button">
            Pregledaj moje termine
          </a>
          
          <p><strong>Molimo Vas zakazite sledeći slobodan termin ili nas kontaktirajte radi dogovora.</strong></p>
          
          <div class="footer">
            <p>Ovo je automatska poruka, molimo ne odgovarajte na ovaj email.</p>
            <p>© ${new Date().getFullYear()} Marysoll Makeup. Sva prava zadržana.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getAppointmentRescheduledHtml(
  data: AppointmentNotificationData,
): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    "http://localhost:3000";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #BA34B7; color: white; padding: 20px; text-align: center; }
        .header-badge { color: white; padding: 5px 10px; border-radius: 5px; display: inline-block; margin: 10px 0; }
        .rescheduled { background-color: #F59E0B; font-weight: bold; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
        .info { margin: 15px 0; }
        .label { font-weight: bold; color: #5D0156; }
        .button { 
          display: inline-block; 
          padding: 10px 20px; 
          background: #BA34B7; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px; 
          margin-top: 20px;
        }
        a.button { color: #fff; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Marysoll Makeup</h1>
          </div>
          <div class="content">
          <h2 class="header-badge rescheduled">Termin je pomeren</h2>
          <p>Poštovani/a ${data.clientName},</p>
          <p>Vaš termin je pomeren!</p>
          
          <div class="info">
            <p><span class="label">Usluga:</span> ${data.serviceName}</p>
            <p><span class="label">Datum:</span> ${data.date}</p>
            <p><span class="label">Vreme:</span> ${data.time}</p>
            ${
              data.adminNote
                ? `<p><span class="label">Napomena salona:</span> ${translateAdminNote(
                    data.adminNote,
                  )}</p>`
                : ""
            }
          </div>
          
          <p>Termin možete pregledati u vašem profilu:</p>
          <a href="${baseUrl}/dashboard?tab=Moji Termini" class="button">
            Pregledaj moje termine
          </a>
          
          <p><strong>Molimo Vas da budete tačni u novom terminu.</strong></p>
          
          <div class="footer">
            <p>Ovo je automatska poruka, molimo ne odgovarajte na ovaj email.</p>
            <p>© ${new Date().getFullYear()} Marysoll Makeup. Sva prava zadržana.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getAppointmentCancelledHtml(
  data: AppointmentNotificationData,
): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    "http://localhost:3000";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #BA34B7; color: white; padding: 20px; text-align: center; }
        .header-badge { color: white; padding: 5px 10px; border-radius: 5px; display: inline-block; margin: 10px 0; }
        .cancelled { background-color: #E53935; font-weight: bold; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
        .info { margin: 15px 0; }
        .label { font-weight: bold; color: #5D0156; }
        .button { 
          display: inline-block; 
          padding: 10px 20px; 
          background: #BA34B7; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px; 
          margin-top: 20px;
        }
        a.button { color: #fff; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Marysoll Makeup</h1>
          </div>
          <div class="content">
          <h2 class="header-badge cancelled">Termin je otkazan</h2>
          <p>Poštovani/a ${data.clientName},</p>
          <p>Vaš termin je otkazan!</p>
          
          <div class="info">
            <p><span class="label">Usluga:</span> ${data.serviceName}</p>
            <p><span class="label">Datum:</span> ${data.date}</p>
            <p><span class="label">Vreme:</span> ${data.time}</p>
            ${
              data.adminNote
                ? `<p><span class="label">Napomena salona:</span> ${translateAdminNote(
                    data.adminNote,
                  )}</p>`
                : ""
            }
          </div>
          
          <p>Termin možete pregledati u vašem profilu:</p>
          <a href="${baseUrl}/dashboard?tab=Moji Termini" class="button">
            Pregledaj moje termine
          </a>
          
          <p><strong>Molimo Vas zakazite sledeći slobodan termin.</strong></p>
          
          <div class="footer">
            <p>Ovo je automatska poruka, molimo ne odgovarajte na ovaj email.</p>
            <p>© ${new Date().getFullYear()} Marysoll Makeup. Sva prava zadržana.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getAppointmentMessageHtml(data: {
  clientName: string;
  serviceName: string;
  date?: string;
  time?: string;
  appointmentId: string;
  senderName: string;
  message: string;
  isAdminSender: boolean;
}): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    "http://localhost:3000";
  const receiver = data.isAdminSender ? "Klijent" : "Admin";
  const sender = data.isAdminSender ? "Salon" : "Klijent";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #BA34B7; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
        .info { margin: 15px 0; padding: 15px; background: white; border-radius: 5px; border-left: 4px solid #5D0156; }
        .label { font-weight: bold; color: #5D0156; }
        .button { 
          display: inline-block; 
          padding: 10px 20px; 
          background: #BA34B7; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px; 
          margin-top: 20px;
        }
        a.button { color: #fff; }
        .message-box { 
          background: #f0f0f0; 
          padding: 15px; 
          border-radius: 5px; 
          border-left: 4px solid #007bff;
          margin: 15px 0;
        }
        .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Marysoll Makeup</h1>
          <h2>Nova poruka za termin</h2>
        </div>
        <div class="content">
          <p>Poštovani/a ${
            data.isAdminSender ? data.clientName : "Administrare"
          },</p>
          <p>Dobili ste novu poruku za vaš termin.</p>
          
          <div class="info">
            <p><span class="label">Termin:</span> ${data.serviceName}</p>
            ${
              data.date
                ? `<p><span class="label">Datum:</span> ${data.date}</p>`
                : ""
            }
            ${
              data.time
                ? `<p><span class="label">Vreme:</span> ${data.time}</p>`
                : ""
            }
            <p><span class="label">Pošiljalac:</span> ${sender}</p>
            <p><span class="label">Primalac:</span> ${receiver}</p>
          </div>
          
          <div class="message-box">
            <p><strong>Poruka:</strong></p>
            <p>${data.message}</p>
          </div>
          
          <p>Da biste odgovorili na poruku, posetite chat za termin:</p>
          <a href="${baseUrl}/dashboard?tab=${
            data.isAdminSender ? "Svi Termini" : "Moji Termini"
          }&appointment=${data.appointmentId}" class="button">
            Idi na chat
          </a>
          
          <div class="footer">
            <p>Ovo je automatska poruka, molimo ne odgovarajte na ovaj email.</p>
            <p>© ${new Date().getFullYear()} Marysoll Makeup. Sva prava zadržana.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getTestimonialCreatedHtml(data: TestimonialNotificationData): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    "http://localhost:3000";
  const stars = "★".repeat(data.rating) + "☆".repeat(5 - data.rating);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #BA34B7; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
        .info { margin: 15px 0; }
        .label { font-weight: bold; color: #5D0156; }
        .button { 
          display: inline-block; 
          padding: 10px 20px; 
          background: #BA34B7; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px; 
          margin-top: 20px;
        }
        a.button { color: #fff; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
        .stars { color: #FFD700; font-size: 18px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Marysoll Makeup</h1>
          <h2>Novi komentar</h2>
        </div>
        <div class="content">
          <p>Poštovani administrare,</p>
          <p>Klijent je ostavio novi komentar.</p>
          
          <div class="info">
            <p><span class="label">Klijent:</span> ${data.clientName}</p>
            <p><span class="label">Usluga:</span> ${data.serviceName}</p>
            <p><span class="label">Ocena:</span> <span class="stars">${stars}</span></p>
            <p><span class="label">Komentar:</span> ${data.comment}</p>
          </div>
          
          <a href="${baseUrl}/dashboard?tab=Svi Komentari" class="button">
            Pregledaj komentare
          </a>
          
          <div class="footer">
            <p>Ovo je automatska poruka, molimo ne odgovarajte na ovaj email.</p>
            <p>© ${new Date().getFullYear()} Marysoll Makeup. Sva prava zadržana.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getTestimonialRepliedHtml(data: TestimonialNotificationData): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    "http://localhost:3000";
  const stars = "★".repeat(data.rating) + "☆".repeat(5 - data.rating);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #BA34B7; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
        .info { margin: 15px 0; }
        .label { font-weight: bold; color: #5D0156; }
        .button { 
          display: inline-block; 
          padding: 10px 20px; 
          background: #BA34B7; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px; 
          margin-top: 20px;
        }
        a.button { color: #fff; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
        .stars { color: #FFD700; font-size: 18px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Marysoll Makeup</h1>
          <h2>Odgovor na vaš komentar</h2>
        </div>
        <div class="content">
          <p>Poštovani/a ${data.clientName},</p>
          <p>Salon je odgovorio na vaš komentar.</p>
          
          <div class="info">
            <p><span class="label">Usluga:</span> ${data.serviceName}</p>
            <p><span class="label">Vaša ocena:</span> <span class="stars">${stars}</span></p>
            <p><span class="label">Vaš komentar:</span> ${data.comment}</p>
            ${
              data.adminReply
                ? `<p><span class="label">Odgovor salona:</span> ${data.adminReply}</p>`
                : ""
            }
          </div>
          
          <a href="${baseUrl}/dashboard?tab=Moji Komentari" class="button">
            Pregledaj sve komentare
          </a>
          
          <div class="footer">
            <p>Ovo je automatska poruka, molimo ne odgovarajte na ovaj email.</p>
            <p>© ${new Date().getFullYear()} Marysoll Makeup. Sva prava zadržana.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getTestimonialUpdatedHtml(data: TestimonialNotificationData): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    "http://localhost:3000";
  const stars = "★".repeat(data.rating) + "☆".repeat(5 - data.rating);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #BA34B7; color: white; padding: 20px; text-align: center; }
        .header-badge { color: white; padding: 5px 10px; border-radius: 5px; display: inline-block; margin: 10px 0; }
        .updated { background-color: #4BB543; font-weight: bold; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
        .info { margin: 15px 0; }
        .label { font-weight: bold; color: #5D0156; }
        .button { 
          display: inline-block; 
          padding: 10px 20px; 
          background: #BA34B7; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px; 
          margin-top: 20px;
        }
        a.button { color: #fff; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
        .stars { color: #FFD700; font-size: 18px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Marysoll Makeup</h1>
          </div>
          <div class="content">
          <h2 class="header-badge updated">Komentar ažuriran ✏️</h2>
          <p>Poštovani administrare,</p>
          <p>Klijent je izmenio svoj komentar.</p>
          
          <div class="info">
            <p><span class="label">Klijent:</span> ${data.clientName}</p>
            <p><span class="label">Usluga:</span> ${data.serviceName}</p>
            <p><span class="label">Nova ocena:</span> <span class="stars">${stars}</span></p>
            <p><span class="label">Ažurirani komentar:</span> ${
              data.comment
            }</p>
            ${
              data.adminReply
                ? `<p><span class="label">Prethodni odgovor salona:</span> ${data.adminReply}</p>`
                : ""
            }
          </div>
          
          <a href="${baseUrl}/dashboard?tab=Svi Komentari" class="button">
            Pregledaj ažurirani komentar
          </a>
          
          <div class="footer">
            <p>Ovo je automatska poruka, molimo ne odgovarajte na ovaj email.</p>
            <p>© ${new Date().getFullYear()} Marysoll Makeup. Sva prava zadržana.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getTestimonialDeletedHtml(data: TestimonialNotificationData): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    "http://localhost:3000";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #BA34B7; color: white; padding: 20px; text-align: center; }
        .header-badge { color: white; padding: 5px 10px; border-radius: 5px; display: inline-block; margin: 10px 0; }
        .deleted { background-color: #FF4D4D; font-weight: bold; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
        .info { margin: 15px 0; }
        .label { font-weight: bold; color: #5D0156; }
        .button { 
          display: inline-block; 
          padding: 10px 20px; 
          background: #BA34B7; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px; 
          margin-top: 20px;
        }
        a.button { color: #fff; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
        .stars { color: #FFD700; font-size: 18px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Marysoll Makeup</h1>
        </div>
          <div class="content">
          <h2 class="header-badge deleted">Komentar obrisan 🗑️</h2>
          <p>Poštovani administrare,</p>
          <p>Komentar je obrisan iz sistema.</p>
          
          <div class="info">
            <p><span class="label">Klijent:</span> ${data.clientName}</p>
            <p><span class="label">Usluga:</span> ${data.serviceName}</p>
            ${
              data.comment
                ? `<p><span class="label">Originalni komentar:</span> ${data.comment.substring(
                    0,
                    100,
                  )}${data.comment.length > 100 ? "..." : ""}</p>`
                : ""
            }
          </div>
          
          <a href="${baseUrl}/dashboard?tab=Svi Komentari" class="button">
            Pregledaj ostale komentare
          </a>
          
          <div class="footer">
            <p>Ovo je automatska poruka, molimo ne odgovarajte na ovaj email.</p>
            <p>© ${new Date().getFullYear()} Marysoll Makeup. Sva prava zadržana.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getTestimonialMessageHtml(data: TestimonialNotificationData): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    "http://localhost:3000";
  const stars = "★".repeat(data.rating) + "☆".repeat(5 - data.rating);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #BA34B7; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
        .info { margin: 15px 0; }
        .label { font-weight: bold; color: #5D0156; }
        .button { 
          display: inline-block; 
          padding: 10px 20px; 
          background: #BA34B7; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px; 
          margin-top: 20px;
        }
        a.button { color: #fff; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
        .stars { color: #FFD700; font-size: 18px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Marysoll Makeup</h1>
          <h2>Sistemska poruka o komentaru</h2>
        </div>
        <div class="content">
          <p>Poštovani administrare,</p>
          <p>Desio se događaj sa komentarom koji zahteva vašu pažnju.</p>
          
          <div class="info">
            <p><span class="label">Klijent:</span> ${data.clientName}</p>
            <p><span class="label">Usluga:</span> ${data.serviceName}</p>
            <p><span class="label">Ocena:</span> <span class="stars">${stars}</span></p>
            ${
              data.comment
                ? `<p><span class="label">Komentar:</span> ${data.comment.substring(
                    0,
                    150,
                  )}${data.comment.length > 150 ? "..." : ""}</p>`
                : ""
            }
            ${
              data.adminReply
                ? `<p><span class="label">Odgovor salona:</span> ${data.adminReply}</p>`
                : ""
            }
          </div>
          
          <a href="${baseUrl}/dashboard?tab=Svi Komentari" class="button">
            Pregledaj komentare
          </a>
          
          <div class="footer">
            <p>Ovo je automatska poruka, molimo ne odgovarajte na ovaj email.</p>
            <p>© ${new Date().getFullYear()} Marysoll Makeup. Sva prava zadržana.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendTestimonialNotification(
  to: string | string[],
  type: "created" | "replied" | "updated" | "deleted" | "message",
  data: TestimonialNotificationData,
): Promise<{ success: boolean; messageId?: string }> {
  // "created" uses branded salon template; others use legacy HTML
  if (type === "created") {
    const html = await testimonialCreatedTemplate({
      clientName: data.clientName,
      serviceName: data.serviceName,
      rating: data.rating ?? 5,
      comment: data.comment ?? "",
      adminReply: data.adminReply,
    });
    return sendEmail({ to, subject: `Hvala na recenziji! — ${data.serviceName}`, html });
  }

  const legacyTemplates = {
    replied:  { subject: `Odgovor na vaš komentar - ${data.serviceName}`,      html: getTestimonialRepliedHtml(data) },
    updated:  { subject: `Komentar ažuriran - ${data.serviceName}`,             html: getTestimonialUpdatedHtml(data) },
    deleted:  { subject: `Komentar obrisan - ${data.serviceName}`,              html: getTestimonialDeletedHtml(data) },
    message:  { subject: `Sistemska poruka - Komentar za ${data.serviceName}`,  html: getTestimonialMessageHtml(data) },
  };
  const template = legacyTemplates[type as keyof typeof legacyTemplates];
  return sendEmail({ to, subject: template.subject, html: template.html });
}

// Reset password email (postojeća funkcija)
export async function sendResetEmail(
  email: string,
  token: string,
  name = "korisniče",
): Promise<void> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  const html = await passwordResetTemplate({ name, resetUrl });
  await sendEmail({
    to: email,
    subject: "Resetovanje lozinke — Marysoll",
    html,
  });
}

const ASSISTANT_URL = process.env.NEXT_ASSISTANT_URL;

export async function sendResetEmailOnAssistant(
  email: string,
  token: string,
  assistantSlug: string,
): Promise<void> {
  const resetUrl = `${ASSISTANT_URL}/${assistantSlug}?token=${token}`;

  try {
    await resend.emails.send({
      from: `"Marysoll Makeup Salon" <${process.env.SYSTEM_FROM_EMAIL}>`,
      to: email,
      subject: "Marysoll Makeup Salon - Resetovanje šifre",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #d4af37; text-align: center;">Marysoll Makeup Salon</h2>
          <p>Poštovana,</p>
          <p>Primili smo zahtev za resetovanje šifre za vaš nalog.</p>
          <p>Kliknite na dugme ispod da resetujete šifru:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #d4af37; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;
                      font-weight: bold; font-size: 16px;">
              Resetuj Moju Šifru
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Ako niste zatražili resetovanje, ignorišite ovaj email.<br>
            <strong>Link će isteći za 1 sat.</strong>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Marysoll Makeup Salon<br>
            Vaš pouzdani salon za šminkanje
          </p>
          <p style="color: #888; font-size: 12px; text-align: center;">
            Link je važeći 60 minuta. Ako niste vi poslali ovaj zahtev, slobodno ignorišite ovaj email.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw error;
  }
}

export async function sendNewsletterEmail(
  to: string | string[],
  subject: string,
  htmlContent: string,
  unsubscribeUrl: string,
  trackingData?: {
    campaignId: string;
    subscriberId: string;
  },
): Promise<{ success: boolean; messageId?: string }> {
  await connectToDB();

  // Dohvati podatke salona iz baze
  const salon = await SalonProfile.findOne().lean<SalonProfileData>();
  if (!salon) {
    throw new Error("Salon profile not found");
  }
  // Dodaj tracking piksel za otvorene email-ove
  const trackingPixel = trackingData
    ? `<img alt="" style="display:none" src="${process.env.NEXT_PUBLIC_APP_URL}/api/newsletter/track/open?campaign=${trackingData.campaignId}&subscriber=${trackingData.subscriberId}" width="1" height="1" />`
    : "";

  // Wrap content u base newsletter template sa footerom
  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${subject}</title>
      <style>
        .newsletter-container { 
          max-width: 600px; 
          margin: 0 auto; 
          font-family: 'Changa', sans-serif; 
          line-height: 1.6; 
          color: #333; 
        }
        .newsletter-header { 
          background: #BA34B7; 
          color: white; 
          padding: 30px; 
          text-align: center; 
        }
        .newsletter-content { 
          background: #fff; 
          padding: 30px; 
          border: 1px solid #eee; 
        }
        .newsletter-footer { 
          background: #f9f9f9; 
          padding: 20px; 
          text-align: center; 
          font-size: 12px; 
          color: #666; 
          border-top: 1px solid #eee;
          margin: 0.5rem auto;
        }
        .unsubscribe-link { 
          color: #D4A574;
        }
        .preference-link {
          color: #5D0156;
        }
        .promo-image { max-width: 100%; height: auto; }
      </style>
    </head>
    <body>
      <div class="newsletter-container">
        <div class="newsletter-header">
          <h1>${salon.name}</h1>
          <h2>Vaš omiljen salon za lepotu</h2>
        </div>
        
        <div class="newsletter-content">
          ${htmlContent}
        </div>
        
        <footer class="newsletter-footer">
        ${
          salon.logo &&
          `<img src="${salon.logo}" alt="${salon.name}" loading="eager" style="max-height: 30px; height: auto;" />`
        }
          <p>${salon.name}<br>
          Adresa: ${salon.street}, ${salon.city}<br>
          Telefon: <a href="tel:${salon.phone}">${salon.phone}</a><br>
          Email: <a href="mailto:${salon.email}">${salon.email}</a></p>
          ${
            salon.social.instagram ||
            salon.social.facebook ||
            salon.social.tiktok
              ? `
          <p class="social-links">
            ${
              salon.social.instagram
                ? `<a href="${salon.social.instagram}" target="_blank">Instagram</a>`
                : ""
            }
            ${
              salon.social.instagram &&
              (salon.social.facebook || salon.social.tiktok)
                ? " | "
                : ""
            }
            ${
              salon.social.facebook
                ? `<a href="${salon.social.facebook}" target="_blank">Facebook</a>`
                : ""
            }
            ${salon.social.facebook && salon.social.tiktok ? " | " : ""}
            ${
              salon.social.tiktok
                ? `<a href="${salon.social.tiktok}" target="_blank">TikTok</a>`
                : ""
            }
          </p>`
              : ""
          }
          <p>
            <a href="${unsubscribeUrl}" class="unsubscribe-link">
              Otkaži pretplatu
            </a> | 
            <a class="preference-link" href="${
              process.env.NEXT_PUBLIC_APP_URL
            }/cookie-policy#open-preferences">
              Podesi preferencije
            </a>
          </p>
          
          <p>© ${new Date().getFullYear()} Marysoll Makeup & Nails. Sva prava zadržana.</p>
          ${trackingPixel}
        </footer>
      </div>
    </body>
    </html>
  `;

  try {
    const { data } = await resend.emails.send({
      from: `Marysoll Makeup & Nails Salon <${
        process.env.NEWSLETTER_FROM_EMAIL || "onboarding@resend.dev"
      }>`,
      replyTo: process.env.SALON_FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: fullHtml,
    });
    return { success: true, messageId: data?.id };
  } catch (error: unknown) {
    console.error("Greška pri slanju preko Resend:", error);
    throw error;
  }
}

// Verifikacioni email za newsletter
export async function sendNewsletterVerificationEmail(
  email: string,
  verificationToken: string,
): Promise<void> {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/newsletter/verify?token=${verificationToken}`;

  await sendEmail({
    to: email,
    subject: "Potvrdite svoju pretplatu na newsletter",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #D4A574;">Potvrda pretplate na newsletter</h2>
        <p>Hvala što ste se pretplatili na newsletter Marysoll Makeup & Nails salona!</p>
        <p>Da biste potvrdili svoju pretplatu, kliknite na dugme ispod:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" 
             style="background-color: #D4A574; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Potvrdi pretplatu
          </a>
        </div>
        <p>Ukoliko niste Vi zatražili ovu pretplatu, ignorišite ovaj email.</p>
      </div>
    `,
  });
}

// Verifikacioni email za registraciju naloga (ako se koristi email verifikacija prilikom registracije) - postojića funkcija, ali je ovde za svaki slučaj da bude na jednom mestu
export async function sendRegisterVerificationEmail(
  email: string,
  verificationToken: string,
  clientName = "korisniče",
): Promise<void> {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}&type=client`;
  const { emailVerificationTemplate } = await import("@/lib/email/templates/otherTemplates");
  const html = await emailVerificationTemplate({
    clientName,
    verificationUrl: verifyUrl,
    ctaLabel: "Potvrdite email adresu →",
  });
  await sendEmail({
    to: email,
    subject: "Potvrdite vašu email adresu",
    html,
  });
}
