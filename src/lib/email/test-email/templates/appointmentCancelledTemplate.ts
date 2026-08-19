import { wrapEmailLayout } from "@/lib/email";

export async function appointmentCancelledTemplate(data: {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  lastUpdatedBy?: "client" | "admin";
}) {
  const byClient = data.lastUpdatedBy !== "admin";

  const content = `
    <p style="margin:0 0 16px 0;">Poštovani/a <strong>${data.clientName}</strong>,</p>
    <p style="margin:0 0 20px 0;">
      ${
        byClient
          ? `Potvrđujemo da ste otkazali vaš termin.`
          : `Obaveštavamo vas da je vaš termin otkazan od strane salona.`
      }
    </p>
 
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background:#fdf0f5;border-radius:12px;margin:0 0 20px 0;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 6px 0;font-family:'Georgia',serif;font-size:12px;color:#b08db5;letter-spacing:1.5px;text-transform:uppercase;">Otkazani termin</p>
          <p style="margin:0 0 2px 0;font-family:'Georgia',serif;font-size:15px;color:#9089fc;text-decoration:line-through;">${data.serviceName}</p>
          <p style="margin:0;font-family:'Georgia',serif;font-size:14px;color:#b08db5;text-decoration:line-through;">${data.date} u ${data.time}</p>
        </td>
      </tr>
      <tr>
      <td align="center" style="padding:28px 40px 12px 40px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
        <p>Termine možete pregledati na vašem profilu:</p>
        <p style="margin:0 0 16px 0;">Možete zakazati novi termin putem naše platforme.</p>
          <tr>
            <td align="center" bgcolor="#7c3aed" style="border-radius:50px;background-color:#7c3aed;padding:14px 36px;mso-padding-alt:14px 36px;">
              <a href="${process.env.NEXTAUTH_URL}/dashboard?tab=Zakazivanja" style="display:inline-block;font-family:'Georgia',serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.8px;white-space:nowrap;">
                Zakaži novi termin
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    </table>
 
    ${!byClient ? `<p style="margin:0 0 16px 0;">Ispričavamo se zbog neprijatnosti.</p>` : ""}
    <p style="margin:0;">Hvala na razumevanju. ✦</p>
  `;

  return wrapEmailLayout({
    title: "Termin otkazan",
    content,
  });
}
