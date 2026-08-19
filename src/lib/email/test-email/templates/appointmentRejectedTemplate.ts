// lib/email/templates/appointmentRejected.ts

import { wrapEmailLayout } from "@/lib/email";

export async function appointmentRejectedTemplate(data: {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  note?: string;
}) {
  const content = `
    <p style="margin:0 0 16px 0;">Poštovani/a <strong>${data.clientName}</strong>,</p>
    <p style="margin:0 0 20px 0;">Nažalost, vaš termin za <strong>${data.serviceName}</strong> dana <strong>${data.date}</strong> nije mogao biti odobren.</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px 0;">
      <tr>
        <td style="padding-bottom:20px;">
          <h2 style="background-color: #E53935; font-weight: bold;color: white; padding: 5px 10px; border-radius: 5px; display: inline-block; margin: 10px 0;margin:0;font-family:'Georgia',serif;font-size:16px;font-weight:600;line-height:1.35;letter-spacing:-0.2px;">
             ✗ Termin odbijen
          </h2>
        </td>
      </tr>
    </table>
    ${
      data.note
        ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
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
    <p>Termine možete pregledati na vašem profilu:</p>
    <tr>
      <td align="center" style="padding:28px 40px 12px 40px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" bgcolor="#7c3aed" style="border-radius:50px;background-color:#7c3aed;padding:14px 36px;mso-padding-alt:14px 36px;">
              <a href="${process.env.NEXTAUTH_URL}/dashboard?tab=Moji Termini" style="display:inline-block;font-family:'Georgia',serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.8px;white-space:nowrap;">
                Pregledaj moje termine
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center">
        <p style="margin:0;">Ispričavamo se zbog neprijatnosti. ✦</p>
      </td>
    </tr>
  `;

  return wrapEmailLayout({
    title: "Termin odbijen",
    content,
  });
}
