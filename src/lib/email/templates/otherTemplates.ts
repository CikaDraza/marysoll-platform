import "server-only";
/**
 * lib/email/templates/otherTemplates.ts
 *
 * Testimonial, verification, newsletter, password reset, and welcome templates.
 * All use wrapEmailLayout for salon-branded HTML wrapper.
 */

import { wrapEmailLayout } from "@/lib/email/wrapEmailLayout";

const appUrl = () => process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";

function ctaButton(label: string, url: string): string {
  return `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0 8px 0;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="border-radius:50px;background:linear-gradient(135deg,#ff80b5 0%,#9089fc 100%);">
              <a href="${url}" style="display:inline-block;padding:14px 36px;font-family:'Georgia',serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.8px;white-space:nowrap;">
                ${label}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

// ── Testimonial created ────────────────────────────────────────────────────────
export async function testimonialCreatedTemplate(data: {
  clientName: string;
  serviceName: string;
  rating: number;
  comment: string;
  adminReply?: string;
  tenantId?: string | null;
}): Promise<string> {
  const stars = "★".repeat(data.rating) + "☆".repeat(5 - data.rating);
  const content = `
    <p style="margin:0 0 16px 0;">Poštovani/a <strong>${data.clientName}</strong>,</p>
    <p style="margin:0 0 20px 0;">Hvala što ste podelili vaše iskustvo! Vaša recenzija je primljena i biće objavljena nakon pregleda.</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background:linear-gradient(135deg,#fff0f7 0%,#f3f0ff 100%);border-radius:12px;margin:0 0 20px 0;">
      <tr>
        <td style="padding:20px 24px;text-align:center;">
          <p style="margin:0 0 8px 0;font-size:28px;letter-spacing:4px;color:gold;">${stars}</p>
          <p style="margin:0 0 8px 0;font-family:'Georgia',serif;font-size:13px;color:#b08db5;letter-spacing:0.5px;">
            Vaša ocena za: <strong style="color:#2d1b40;">${data.serviceName}</strong>
          </p>
          <p style="margin:0;font-family:'Georgia',serif;font-size:14px;color:#3d2952;font-style:italic;">"${data.comment}"</p>
          ${data.adminReply ? `
          <div style="margin-top:16px;padding:12px 16px;background:rgba(255,255,255,0.7);border-radius:8px;text-align:left;">
            <p style="margin:0 0 4px;font-size:11px;color:#b08db5;text-transform:uppercase;letter-spacing:1px;">Odgovor salona</p>
            <p style="margin:0;font-size:13px;color:#5d3f7a;">${data.adminReply}</p>
          </div>` : ""}
        </td>
      </tr>
    </table>
    ${ctaButton("Pregledaj moje recenzije", `${appUrl()}/dashboard?tab=Moje+Preporuke`)}
    <p style="margin:8px 0 0 0;">Vaše mišljenje nam puno znači. Hvala! ✦</p>
  `;
  return wrapEmailLayout({ title: "Recenzija primljena", content, tenantId: data.tenantId });
}

// ── Email verification (client registration) ──────────────────────────────────
export async function emailVerificationTemplate(data: {
  clientName: string;
  verificationUrl: string;
  ctaLabel?: string;
  tenantId?: string | null;
}): Promise<string> {
  const content = `
    <p style="margin:0 0 16px 0;">Poštovani/a <strong>${data.clientName}</strong>,</p>
    <p style="margin:0 0 20px 0;">Hvala što ste se registrovali! Molimo vas da potvrdite vašu email adresu klikom na dugme ispod.</p>
    ${ctaButton(data.ctaLabel || "Potvrdite email adresu →", data.verificationUrl)}
    <p style="margin:16px 0 0 0;font-size:13px;color:#9089b0;font-style:italic;">
      Link je važeći 24 sata. Ako niste zatražili verifikaciju, ignorišite ovaj mejl.
    </p>
    <p style="margin:8px 0 0 0;">Dobrodošli! ✦</p>
  `;
  return wrapEmailLayout({ title: "Potvrdite email adresu", content, tenantId: data.tenantId });
}

// ── Password reset ────────────────────────────────────────────────────────────
export async function passwordResetTemplate(data: {
  name: string;
  resetUrl: string;
}): Promise<string> {
  const content = `
    <p style="margin:0 0 16px 0;">Poštovani/a <strong>${data.name}</strong>,</p>
    <p style="margin:0 0 20px 0;">Primili smo zahtev za resetovanje lozinke za vaš nalog.</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background:linear-gradient(135deg,#fff0f7 0%,#f3f0ff 100%);border-radius:12px;margin:0 0 20px 0;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0;font-family:'Georgia',serif;font-size:14px;color:#3d2952;line-height:1.7;">
            🔐 Kliknite na dugme ispod da biste resetovali lozinku.<br>
            <span style="font-size:12px;color:#9089b0;">Link je važeći <strong>1 sat</strong>.</span>
          </p>
        </td>
      </tr>
    </table>
    ${ctaButton("Resetuj lozinku →", data.resetUrl)}
    <p style="margin:16px 0 0 0;font-size:13px;color:#9089b0;font-style:italic;">
      Ako niste vi zatražili resetovanje, slobodno ignorišite ovaj email. Vaša lozinka ostaje nepromenjena.
    </p>
  `;
  return wrapEmailLayout({ title: "Resetovanje lozinke", content });
}

// ── Owner verification (salon registration) ───────────────────────────────────
export async function ownerVerificationTemplate(data: {
  ownerName: string;
  salonName: string;
  verifyUrl: string;
  subdomain: string;
  trialDays: number;
}): Promise<string> {
  const content = `
    <p style="margin:0 0 16px 0;">Zdravo <strong>${data.ownerName}</strong>,</p>
    <p style="margin:0 0 20px 0;">Uspešno ste registrovali salon <strong>${data.salonName}</strong>. Potvrdite email da aktivirate nalog.</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background:linear-gradient(135deg,#fff0f7 0%,#f3f0ff 100%);border-radius:12px;margin:0 0 20px 0;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0;font-family:'Georgia',serif;font-size:13px;color:#3d2952;line-height:2;">
            ✅ Probni period: <strong>${data.trialDays} dana besplatno</strong><br>
            🌐 Vaš subdomen: <strong>${data.subdomain}</strong><br>
            📅 Online zakazivanje odmah aktivno
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 4px;font-size:13px;color:#9089b0;">Link važi <strong>24 sata</strong>.</p>
    ${ctaButton("Potvrdite email adresu →", data.verifyUrl)}
  `;
  return wrapEmailLayout({ title: `Potvrdite email — ${data.salonName}`, content });
}

// ── Owner welcome (after email verification) ──────────────────────────────────
export async function ownerWelcomeTemplate(data: {
  ownerName: string;
  salonName: string;
  subdomain: string;
  dashboardUrl: string;
  trialDays: number;
  trialEndsAt: string;
}): Promise<string> {
  const content = `
    <p style="margin:0 0 16px 0;">Zdravo <strong>${data.ownerName}</strong>,</p>
    <p style="margin:0 0 20px 0;">Email je potvrđen — salon je aktivan! 🎉</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background:linear-gradient(135deg,#fff0f7 0%,#f3f0ff 100%);border-radius:12px;margin:0 0 20px 0;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 8px;font-weight:700;color:#2d1b40;font-size:16px;">${data.salonName}</p>
          <p style="margin:0;font-family:'Georgia',serif;font-size:13px;color:#3d2952;line-height:2;">
            🌐 Subdomen: <strong>${data.subdomain}</strong><br>
            🎁 Probni period: <strong>${data.trialDays} dana</strong> (do ${data.trialEndsAt})<br>
            📊 Status: <strong style="color:#16a34a;">Aktivan</strong>
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#3d2952;">Sledeći koraci:</p>
    <p style="margin:0 0 20px;font-size:13px;color:#6b5b7e;line-height:1.9;">
      1. Popunite profil salona (logo, radno vreme, adresa)<br>
      2. Dodajte usluge i cenovnik<br>
      3. Podelite link klijentima — mogu odmah da zakazuju
    </p>
    ${ctaButton("Otvorite Admin Panel →", data.dashboardUrl)}
  `;
  return wrapEmailLayout({ title: "Salon aktiviran! 🎉", content });
}

// ── Client verification ────────────────────────────────────────────────────────
export async function clientVerificationTemplate(data: {
  clientName: string;
  salonName: string;
  verifyUrl: string;
  tenantId?: string | null;
}): Promise<string> {
  const content = `
    <p style="margin:0 0 16px 0;">Zdravo <strong>${data.clientName}</strong>,</p>
    <p style="margin:0 0 20px 0;">Registrovali ste se na platformu salona <strong>${data.salonName}</strong>. Potvrdite email da biste mogli da zakazujete termine.</p>
    <p style="margin:0 0 4px;font-size:13px;color:#9089b0;">Link važi <strong>24 sata</strong>.</p>
    ${ctaButton("Potvrdite email adresu →", data.verifyUrl)}
  `;
  return wrapEmailLayout({ title: `Potvrdite email — ${data.salonName}`, content, tenantId: data.tenantId });
}

// ── Client welcome ────────────────────────────────────────────────────────────
export async function clientWelcomeTemplate(data: {
  clientName: string;
  salonName: string;
  salonUrl: string;
  tenantId?: string | null;
}): Promise<string> {
  const content = `
    <p style="margin:0 0 16px 0;">Zdravo <strong>${data.clientName}</strong>,</p>
    <p style="margin:0 0 20px 0;">Vaš nalog u salonu <strong>${data.salonName}</strong> je spreman. Možete zakazati termine, pregledati cenovnik i pratiti vaše rezervacije.</p>
    ${ctaButton("Zakažite termin →", data.salonUrl)}
  `;
  return wrapEmailLayout({ title: `Dobrodošli u ${data.salonName}! 🎉`, content, tenantId: data.tenantId });
}

// ── Testimonial replied (to client) ───────────────────────────────────────────
export async function testimonialRepliedTemplate(data: {
  clientName: string;
  serviceName: string;
  rating: number;
  comment: string;
  adminReply: string;
  tenantId?: string | null;
}): Promise<string> {
  const stars = "★".repeat(data.rating) + "☆".repeat(5 - data.rating);
  const content = `
    <p style="margin:0 0 16px 0;">Poštovani/a <strong>${data.clientName}</strong>,</p>
    <p style="margin:0 0 20px 0;">Salon je odgovorio na vašu recenziju.</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background:linear-gradient(135deg,#fff0f7 0%,#f3f0ff 100%);border-radius:12px;margin:0 0 20px 0;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 6px 0;font-size:28px;letter-spacing:4px;color:gold;">${stars}</p>
          <p style="margin:0 0 8px 0;font-family:'Georgia',serif;font-size:13px;color:#b08db5;">
            Vaša recenzija za: <strong style="color:#2d1b40;">${data.serviceName}</strong>
          </p>
          <p style="margin:0 0 12px 0;font-family:'Georgia',serif;font-size:14px;color:#3d2952;font-style:italic;">"${data.comment}"</p>
          <div style="padding:12px 16px;background:rgba(255,255,255,0.7);border-radius:8px;border-left:3px solid #ff80b5;">
            <p style="margin:0 0 4px;font-size:11px;color:#b08db5;text-transform:uppercase;letter-spacing:1px;">Odgovor salona</p>
            <p style="margin:0;font-size:13px;color:#5d3f7a;">${data.adminReply}</p>
          </div>
        </td>
      </tr>
    </table>
    ${ctaButton("Pogledaj moje recenzije", `${appUrl()}/dashboard?tab=Moje+Preporuke`)}
  `;
  return wrapEmailLayout({ title: "Salon je odgovorio na vašu recenziju", content, tenantId: data.tenantId });
}

// ── Testimonial updated (admin notification) ──────────────────────────────────
export async function testimonialUpdatedTemplate(data: {
  clientName: string;
  serviceName: string;
  rating: number;
  comment: string;
  tenantId?: string | null;
}): Promise<string> {
  const stars = "★".repeat(data.rating) + "☆".repeat(5 - data.rating);
  const content = `
    <p style="margin:0 0 16px 0;">Klijent <strong>${data.clientName}</strong> je izmenio recenziju.</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background:linear-gradient(135deg,#fff0f7 0%,#f3f0ff 100%);border-radius:12px;margin:0 0 20px 0;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 6px 0;font-size:20px;letter-spacing:3px;color:gold;">${stars}</p>
          <p style="margin:0 0 6px 0;font-size:13px;color:#b08db5;">Usluga: <strong style="color:#2d1b40;">${data.serviceName}</strong></p>
          <p style="margin:0;font-size:14px;color:#3d2952;font-style:italic;">"${data.comment}"</p>
        </td>
      </tr>
    </table>
    ${ctaButton("Pregledaj recenzije", `${appUrl()}/dashboard?tab=Svi+Komentari`)}
  `;
  return wrapEmailLayout({ title: "Recenzija izmenjena ✏️", content, tenantId: data.tenantId });
}

// ── Testimonial deleted (admin notification) ──────────────────────────────────
export async function testimonialDeletedTemplate(data: {
  clientName: string;
  serviceName: string;
  comment?: string;
  tenantId?: string | null;
}): Promise<string> {
  const content = `
    <p style="margin:0 0 16px 0;">Recenzija klijenta <strong>${data.clientName}</strong> je obrisana.</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background:linear-gradient(135deg,#fff0f7 0%,#f3f0ff 100%);border-radius:12px;margin:0 0 20px 0;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 6px 0;font-size:13px;color:#b08db5;">Usluga: <strong style="color:#2d1b40;">${data.serviceName}</strong></p>
          ${data.comment ? `<p style="margin:8px 0 0 0;font-size:14px;color:#3d2952;font-style:italic;">"${data.comment.substring(0, 120)}${data.comment.length > 120 ? "…" : ""}"</p>` : ""}
        </td>
      </tr>
    </table>
    ${ctaButton("Pregledaj recenzije", `${appUrl()}/dashboard?tab=Svi+Komentari`)}
  `;
  return wrapEmailLayout({ title: "Recenzija obrisana 🗑️", content, tenantId: data.tenantId });
}

// ── Testimonial message / system event (admin notification) ───────────────────
export async function testimonialMessageTemplate(data: {
  clientName: string;
  serviceName: string;
  rating: number;
  comment?: string;
  adminReply?: string;
  tenantId?: string | null;
}): Promise<string> {
  const stars = "★".repeat(data.rating) + "☆".repeat(5 - data.rating);
  const content = `
    <p style="margin:0 0 16px 0;">Sistemski događaj za recenziju klijenta <strong>${data.clientName}</strong>.</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background:linear-gradient(135deg,#fff0f7 0%,#f3f0ff 100%);border-radius:12px;margin:0 0 20px 0;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 6px 0;font-size:20px;letter-spacing:3px;color:gold;">${stars}</p>
          <p style="margin:0 0 6px 0;font-size:13px;color:#b08db5;">Usluga: <strong style="color:#2d1b40;">${data.serviceName}</strong></p>
          ${data.comment ? `<p style="margin:0 0 8px 0;font-size:14px;color:#3d2952;font-style:italic;">"${data.comment.substring(0, 150)}${data.comment.length > 150 ? "…" : ""}"</p>` : ""}
          ${data.adminReply ? `<div style="margin-top:10px;padding:10px 14px;background:rgba(255,255,255,0.6);border-radius:8px;"><p style="margin:0;font-size:12px;color:#b08db5;">Odgovor salona:</p><p style="margin:4px 0 0;font-size:13px;color:#5d3f7a;">${data.adminReply}</p></div>` : ""}
        </td>
      </tr>
    </table>
    ${ctaButton("Pregledaj recenzije", `${appUrl()}/dashboard?tab=Svi+Komentari`)}
  `;
  return wrapEmailLayout({ title: "Sistemska poruka — recenzija", content, tenantId: data.tenantId });
}

// ── Newsletter verification ───────────────────────────────────────────────────
export async function newsletterVerificationTemplate(data: {
  verifyUrl: string;
  tenantId?: string | null;
}): Promise<string> {
  const content = `
    <p style="margin:0 0 20px 0;">Hvala što ste se pretplatili na naš newsletter! Molimo potvrdite svoju email adresu klikom na dugme ispod.</p>
    ${ctaButton("Potvrdi pretplatu →", data.verifyUrl)}
    <p style="margin:16px 0 0 0;font-size:13px;color:#9089b0;font-style:italic;">
      Ako niste vi zatražili ovu pretplatu, slobodno ignorišite ovaj email.
    </p>
  `;
  return wrapEmailLayout({ title: "Potvrdite pretplatu na newsletter", content, tenantId: data.tenantId });
}

// ── Newsletter promotion ───────────────────────────────────────────────────────
export async function newsletterPromotionTemplate(data: {
  clientName: string;
  subject: string;
  content: string;
  ctaUrl?: string;
  ctaLabel?: string;
  unsubscribeUrl: string;
  tenantId?: string | null;
  trackingData?: { campaignId: string; subscriberId: string };
}): Promise<string> {
  const trackingPixel = data.trackingData
    ? `<img alt="" style="display:none" src="${appUrl()}/api/newsletter/track/open?campaign=${data.trackingData.campaignId}&subscriber=${data.trackingData.subscriberId}" width="1" height="1" />`
    : "";

  const innerContent = `
    <p style="margin:0 0 16px 0;">Poštovani/a <strong>${data.clientName}</strong>,</p>
    ${data.content}
    ${data.ctaUrl && data.ctaLabel ? ctaButton(data.ctaLabel, data.ctaUrl) : ""}
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:32px 0 0 0;">
      <tr>
        <td align="center">
          <p style="margin:0;font-size:11px;color:#c8b8d0;">
            <a href="${data.unsubscribeUrl}" class="unsubscribe-link" style="color:#5D0156;text-decoration:underline;">Otkaži pretplatu</a>
            &nbsp;|&nbsp;
            <a style="color:#5D0156;text-decoration:underline;" href="${appUrl()}/cookie-policy#open-preferences">Podesi preferencije</a>
          </p>
        </td>
      </tr>
    </table>
    ${trackingPixel}
  `;

  return wrapEmailLayout({ title: data.subject, content: innerContent, tenantId: data.tenantId });
}
