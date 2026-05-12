import "server-only";
/**
 * lib/email/templates/appointmentTemplates.ts
 *
 * All appointment-related transactional email templates.
 * Uses wrapEmailLayout for salon-branded HTML wrapper.
 */

import { wrapEmailLayout } from "@/lib/email/wrapEmailLayout";
import { translateAdminNote } from "@/lib/email/helpers";

// ── Shared: appointment detail table ──────────────────────────────────────────
function appointmentDetailTable(data: {
  serviceName: string;
  date: string;
  time: string;
  note?: string;
}): string {
  return `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
    style="background:linear-gradient(135deg,#fff0f7 0%,#f3f0ff 100%);border-radius:12px;margin:0 0 20px 0;">
    <tr>
      <td style="padding:20px 24px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding-bottom:10px;border-bottom:1px solid #f0e0f0;">
              <p style="margin:0;font-family:'Georgia',serif;font-size:11px;color:#b08db5;letter-spacing:1.5px;text-transform:uppercase;">Usluga</p>
              <p style="margin:4px 0 0 0;font-family:'Georgia',serif;font-size:16px;font-weight:700;color:#2d1b40;">${data.serviceName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f0e0f0;">
              <p style="margin:0;font-family:'Georgia',serif;font-size:11px;color:#b08db5;letter-spacing:1.5px;text-transform:uppercase;">Datum</p>
              <p style="margin:4px 0 0 0;font-family:'Georgia',serif;font-size:16px;font-weight:700;color:#2d1b40;">${data.date}</p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:10px;">
              <p style="margin:0;font-family:'Georgia',serif;font-size:11px;color:#b08db5;letter-spacing:1.5px;text-transform:uppercase;">Vreme</p>
              <p style="margin:4px 0 0 0;font-family:'Georgia',serif;font-size:16px;font-weight:700;color:#2d1b40;">${data.time}</p>
            </td>
          </tr>
          ${
            data.note
              ? `
          <tr>
            <td style="padding-top:10px;border-top:1px solid #f0e0f0;">
              <p style="margin:0;font-family:'Georgia',serif;font-size:11px;color:#b08db5;letter-spacing:1.5px;text-transform:uppercase;">Napomena</p>
              <p style="margin:4px 0 0 0;font-family:'Georgia',serif;font-size:14px;font-style:italic;color:#6b5b7e;">${translateAdminNote(data.note)}</p>
            </td>
          </tr>`
              : ""
          }
        </table>
      </td>
    </tr>
  </table>`;
}

function ctaButton(label: string, url: string): string {
  return `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0 8px 0;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" bgcolor="#7f22fe" style="border-radius:50px;background:linear-gradient(135deg,#ff80b5 0%,#9089fc 100%);">
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

const appUrl = () =>
  process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";

// ── Templates ─────────────────────────────────────────────────────────────────

export async function appointmentCreatedTemplate(data: {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  note?: string;
  tenantId?: string | null;
}): Promise<string> {
  const content = `
    <p style="margin:0 0 16px 0;">Poštovani/a <strong>${data.clientName}</strong>,</p>
    <p style="margin:0 0 20px 0;">Vaš termin je uspešno zakazan i čeka odobrenje. Radujemo se vašoj poseti!</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px 0;">
      <tr>
        <td>
          <span style="display:inline-block;background-color:#801cf8;color:#ffffff;font-weight:bold;padding:5px 12px;border-radius:6px;font-family:'Georgia',serif;font-size:14px;">
            🗓 Termin čeka odobrenje
          </span>
        </td>
      </tr>
    </table>
    ${appointmentDetailTable(data)}
    ${ctaButton("Pogledaj termin", `${appUrl()}/dashboard?tab=Moji+Termini`)}
    <p style="margin:8px 0 0 0;font-size:13px;color:#9089b0;">Obaveštićemo vas čim termin bude potvrđen. ✦</p>
  `;
  return wrapEmailLayout({
    title: "Termin zakazan",
    content,
    tenantId: data.tenantId,
  });
}

export async function appointmentApprovedTemplate(data: {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  note?: string;
  tenantId?: string | null;
}): Promise<string> {
  const content = `
    <p style="margin:0 0 16px 0;">Poštovani/a <strong>${data.clientName}</strong>,</p>
    <p style="margin:0 0 20px 0;">Vaš termin je <strong style="color:#9089fc;">potvrđen</strong>. Jedva čekamo da vas vidimo!</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px 0;">
      <tr>
        <td>
          <span style="display:inline-block;background-color:#4BB543;color:#ffffff;font-weight:bold;padding:5px 12px;border-radius:6px;font-family:'Georgia',serif;font-size:14px;">
            ✓ Termin potvrđen
          </span>
        </td>
      </tr>
    </table>
    ${appointmentDetailTable(data)}
    <p style="margin:0;">Ako imate pitanja, slobodno nas kontaktirajte. ✦</p>
  `;
  return wrapEmailLayout({
    title: "Termin potvrđen ✓",
    content,
    tenantId: data.tenantId,
  });
}

export async function appointmentRejectedTemplate(data: {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  note?: string;
  tenantId?: string | null;
}): Promise<string> {
  const content = `
    <p style="margin:0 0 16px 0;">Poštovani/a <strong>${data.clientName}</strong>,</p>
    <p style="margin:0 0 20px 0;">Nažalost, vaš termin za <strong>${data.serviceName}</strong> dana <strong>${data.date}</strong> nije mogao biti odobren.</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px 0;">
      <tr>
        <td>
          <span style="display:inline-block;background-color:#E53935;color:#ffffff;font-weight:bold;padding:5px 12px;border-radius:6px;font-family:'Georgia',serif;font-size:14px;">
            ✗ Termin odbijen
          </span>
        </td>
      </tr>
    </table>
    ${
      data.note
        ? `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background:#fff5f8;border-left:3px solid #ff80b5;border-radius:0 8px 8px 0;margin:0 0 20px 0;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0;font-family:'Georgia',serif;font-size:14px;color:#6b5b7e;font-style:italic;">${data.note}</p>
        </td>
      </tr>
    </table>`
        : ""
    }
    <p style="margin:0 0 16px 0;">Možete zakazati novi termin putem naše platforme.</p>
    ${ctaButton("Zakaži novi termin", `${appUrl()}/dashboard?tab=Zakazivanja`)}
    <p style="margin:8px 0 0 0;">Ispričavamo se zbog neprijatnosti. ✦</p>
  `;
  return wrapEmailLayout({
    title: "Informacija o vašem terminu",
    content,
    tenantId: data.tenantId,
  });
}

export async function appointmentRescheduledTemplate(data: {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  proposedDate: string;
  proposedTime: string;
  note?: string;
  tenantId?: string | null;
}): Promise<string> {
  const content = `
    <p style="margin:0 0 16px 0;">Poštovani/a <strong>${data.clientName}</strong>,</p>
    <p style="margin:0 0 20px 0;">Vaš termin je promenjen. Ispod su novi detalji:</p>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px 0;">
      <tr>
        <td width="48%" valign="top" style="background:#f9f0f5;border-radius:10px;padding:16px 18px;">
          <p style="margin:0 0 8px 0;font-family:'Georgia',serif;font-size:11px;color:#b08db5;letter-spacing:1.5px;text-transform:uppercase;">Stari termin</p>
          <p style="margin:0 0 4px 0;font-family:'Georgia',serif;font-size:14px;color:#9089fc;text-decoration:line-through;">${data.date}</p>
          <p style="margin:0;font-family:'Georgia',serif;font-size:14px;color:#9089fc;text-decoration:line-through;">${data.time}</p>
        </td>
        <td width="4%" align="center" valign="middle" style="font-size:18px;color:#ff80b5;padding:0 8px;">→</td>
        <td width="48%" valign="top" style="background:linear-gradient(135deg,#fff0f7 0%,#f3f0ff 100%);border-radius:10px;padding:16px 18px;">
          <p style="margin:0 0 8px 0;font-family:'Georgia',serif;font-size:11px;color:#b08db5;letter-spacing:1.5px;text-transform:uppercase;">Novi termin</p>
          <p style="margin:0 0 4px 0;font-family:'Georgia',serif;font-size:15px;font-weight:700;color:#2d1b40;">${data.proposedDate}</p>
          <p style="margin:0;font-family:'Georgia',serif;font-size:15px;font-weight:700;color:#2d1b40;">${data.proposedTime}</p>
        </td>
      </tr>
    </table>

    ${data.note ? `<p style="margin:0 0 16px 0;font-size:14px;color:#6b5b7e;font-style:italic;">Napomena: ${data.note}</p>` : ""}
    <p style="margin:0 0 20px 0;">Molimo vas da potvrdite da li vam odgovara novi termin.</p>
    ${ctaButton("Potvrdite termin", `${appUrl()}/dashboard?tab=Moji+Termini`)}
    <p style="margin:8px 0 0 0;">Vidimo se uskoro! ✦</p>
  `;
  return wrapEmailLayout({
    title: "Vaš termin je pomeren",
    content,
    tenantId: data.tenantId,
  });
}

export async function appointmentMessageTemplate(data: {
  clientName: string;
  serviceName: string;
  date?: string;
  time?: string;
  appointmentId: string;
  senderName: string;
  message: string;
  isAdminSender: boolean;
  tenantId?: string | null;
}): Promise<string> {
  const receiver = data.isAdminSender ? data.clientName : "Administrare";
  const senderLabel = data.isAdminSender ? "Salon" : "Klijent";
  const dashboardTab = data.isAdminSender ? "Moji+Termini" : "Svi+Termini";

  const content = `
    <p style="margin:0 0 16px 0;">Poštovani/a <strong>${receiver}</strong>,</p>
    <p style="margin:0 0 20px 0;">Dobili ste novu poruku za termin.</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background:linear-gradient(135deg,#fff0f7 0%,#f3f0ff 100%);border-radius:12px;margin:0 0 20px 0;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 6px 0;font-family:'Georgia',serif;font-size:13px;color:#b08db5;">Usluga: <strong style="color:#2d1b40;">${data.serviceName}</strong></p>
          ${data.date ? `<p style="margin:0 0 4px 0;font-size:13px;color:#6b5b7e;">Datum: <strong>${data.date}</strong></p>` : ""}
          ${data.time ? `<p style="margin:0 0 4px 0;font-size:13px;color:#6b5b7e;">Vreme: <strong>${data.time}</strong></p>` : ""}
          <p style="margin:6px 0 0 0;font-size:12px;color:#b08db5;">Pošiljalac: <strong>${senderLabel} (${data.senderName})</strong></p>
        </td>
      </tr>
    </table>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background:#ffffff;border-left:4px solid #ff80b5;border-radius:0 8px 8px 0;margin:0 0 20px 0;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 6px 0;font-size:11px;color:#b08db5;text-transform:uppercase;letter-spacing:1px;">Poruka</p>
          <p style="margin:0;font-family:'Georgia',serif;font-size:14px;color:#3d2952;font-style:italic;">${data.message}</p>
        </td>
      </tr>
    </table>
    ${ctaButton("Idi na chat", `${appUrl()}/dashboard?tab=${dashboardTab}&appointment=${data.appointmentId}`)}
  `;
  return wrapEmailLayout({
    title: "Nova poruka za termin",
    content,
    tenantId: data.tenantId,
  });
}

export async function appointmentCancelledTemplate(data: {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  lastUpdatedBy?: "client" | "admin";
  tenantId?: string | null;
}): Promise<string> {
  const byClient = data.lastUpdatedBy !== "admin";
  const content = `
    <p style="margin:0 0 16px 0;">Poštovani/a <strong>${data.clientName}</strong>,</p>
    <p style="margin:0 0 20px 0;">
      ${
        byClient
          ? "Potvrđujemo da ste otkazali vaš termin."
          : "Obaveštavamo vas da je vaš termin otkazan od strane salona."
      }
    </p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background:#fdf0f5;border-radius:12px;margin:0 0 20px 0;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 6px 0;font-family:'Georgia',serif;font-size:11px;color:#b08db5;letter-spacing:1.5px;text-transform:uppercase;">Otkazani termin</p>
          <p style="margin:0 0 2px 0;font-family:'Georgia',serif;font-size:15px;color:#9089fc;text-decoration:line-through;">${data.serviceName}</p>
          <p style="margin:0;font-family:'Georgia',serif;font-size:13px;color:#b08db5;text-decoration:line-through;">${data.date} u ${data.time}</p>
        </td>
      </tr>
    </table>
    ${ctaButton("Zakaži novi termin", `${appUrl()}/dashboard?tab=Zakazivanja`)}
    ${!byClient ? `<p style="margin:16px 0 0 0;">Ispričavamo se zbog neprijatnosti.</p>` : ""}
    <p style="margin:8px 0 0 0;">Hvala na razumevanju. ✦</p>
  `;
  return wrapEmailLayout({
    title: "Termin otkazan",
    content,
    tenantId: data.tenantId,
  });
}
