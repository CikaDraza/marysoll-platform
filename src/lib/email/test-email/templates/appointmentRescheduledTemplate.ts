import { wrapEmailLayout } from "@/lib/email";

export async function appointmentRescheduledTemplate(data: {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  proposedDate: string;
  proposedTime: string;
  note?: string;
}) {
  const content = `
    <p style="margin:0 0 16px 0;">Poštovani/a <strong>${data.clientName}</strong>,</p>
    <p style="margin:0 0 20px 0;">Vaš termin je promenjen. Ispod su novi detalji:</p>
 
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px 0;">
      <tr>
        <!-- Old -->
        <td width="48%" valign="top"
          style="background:#f9f0f5;border-radius:10px;padding:16px 18px;">
          <p style="margin:0 0 8px 0;font-family:'Georgia',serif;font-size:11px;color:#b08db5;letter-spacing:1.5px;text-transform:uppercase;">Stari termin</p>
          <p style="margin:0 0 4px 0;font-family:'Georgia',serif;font-size:14px;color:#9089fc;text-decoration:line-through;">${data.date}</p>
          <p style="margin:0;font-family:'Georgia',serif;font-size:14px;color:#9089fc;text-decoration:line-through;">${data.time}</p>
        </td>
        <td width="4%" align="center" valign="middle" style="font-size:18px;color:#ff80b5;">→</td>
        <!-- New -->
        <td width="48%" valign="top"
          style="background:linear-gradient(135deg,#fff0f7 0%,#f3f0ff 100%);border-radius:10px;padding:16px 18px;">
          <p style="margin:0 0 8px 0;font-family:'Georgia',serif;font-size:11px;color:#b08db5;letter-spacing:1.5px;text-transform:uppercase;">Novi termin</p>
          <p style="margin:0 0 4px 0;font-family:'Georgia',serif;font-size:15px;font-weight:700;color:#2d1b40;">${data.proposedDate}</p>
          <p style="margin:0;font-family:'Georgia',serif;font-size:15px;font-weight:700;color:#2d1b40;">${data.proposedTime}</p>
        </td>
      </tr>
    </table>
 
    ${data.note ? `<p style="margin:0 0 16px 0;font-size:14px;color:#6b5b7e;font-style:italic;">Napomena: ${data.note}</p>` : ""}

    <table role="actions" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px 0;">
      <tr>
        <td>
          <p style="margin:0 0 20px 0;">Molimo vas da potvrdite da li vam odgovara novi termin.</p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:28px 40px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="border-radius:50px;background:linear-gradient(135deg,#ff80b5 0%,#9089fc 100%);">
                <a href="${process.env.NEXTAUTH_URL}/dashboard?tab=Svi Termini" style="display:inline-block;padding:14px 36px;font-family:'Georgia',serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.8px;white-space:nowrap;">
                  Potvrdite termin
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0;">Vidimo se uskoro! ✦</p>
  `;

  return wrapEmailLayout({
    title: "Termin pomeren",
    content,
  });
}
