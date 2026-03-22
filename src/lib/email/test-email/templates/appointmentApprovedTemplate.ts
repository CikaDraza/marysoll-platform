import { wrapEmailLayout } from "@/lib/email";
import { translateAdminNote } from "../helpers";

export async function appointmentApprovedTemplate(data: {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  note?: string;
}) {
  const content = `
    <p style="margin:0 0 16px 0;">Poštovani/a <strong>${data.clientName}</strong>,</p>
    <p style="margin:0 0 20px 0;">Vaš termin je <strong style="color:#9089fc;">potvrđen</strong>. Jedva čekamo da vas vidimo!</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px 0;">
      <tr>
        <td style="padding-bottom:20px;">
          <h2 style="background-color: #4BB543; font-weight: bold;color: white; padding: 5px 10px; border-radius: 5px; display: inline-block; margin: 10px 0;margin:0;font-family:'Georgia',serif;font-size:16px;font-weight:600;line-height:1.35;letter-spacing:-0.2px;">
             ✓ Termin potvrđen
          </h2>
        </td>
      </tr>
      <tr>
        <td style="margin: 15px 0;">
          <p style="font-weight: bold; color: #5D0156;">Vaš termin za ${data.serviceName} je potvrđen</p>
        </td>
      </tr>
    </table>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background:linear-gradient(135deg,#fff0f7 0%,#f3f0ff 100%);border-radius:12px;margin:0 0 20px 0;">
      <tr>
        <td style="padding:20px 24px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding-bottom:10px;border-bottom:1px solid #f0e0f0;">
                <p style="margin:0;font-family:'Georgia',serif;font-size:12px;color:#b08db5;letter-spacing:1.5px;text-transform:uppercase;">Usluga</p>
                <p style="margin:4px 0 0 0;font-family:'Georgia',serif;font-size:16px;font-weight:700;color:#2d1b40;">${data.serviceName}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0 10px 0;border-bottom:1px solid #f0e0f0;">
                <p style="margin:0;font-family:'Georgia',serif;font-size:12px;color:#b08db5;letter-spacing:1.5px;text-transform:uppercase;">Datum</p>
                <p style="margin:4px 0 0 0;font-family:'Georgia',serif;font-size:16px;font-weight:700;color:#2d1b40;">${data.date}</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:10px;">
                <p style="margin:0;font-family:'Georgia',serif;font-size:12px;color:#b08db5;letter-spacing:1.5px;text-transform:uppercase;">Vreme</p>
                <p style="margin:4px 0 0 0;font-family:'Georgia',serif;font-size:16px;font-weight:700;color:#2d1b40;">${data.time}</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:10px;">
                <p style="margin:0;font-family:'Georgia',serif;font-size:12px;color:#b08db5;letter-spacing:1.5px;text-transform:uppercase;">Napomena</p>
                <p style="margin:4px 0 0 0;font-family:'Georgia',serif;font-size:16px;font-weight:700;color:#2d1b40;">
                ${data.note ? `${translateAdminNote(data.note)}` : ""}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
 
    <p style="margin:0;">Ako imate pitanja, slobodno nas kontaktirajte. ✦</p>
  `;

  return wrapEmailLayout({
    title: "Termin potvrđen",
    content,
  });
}
