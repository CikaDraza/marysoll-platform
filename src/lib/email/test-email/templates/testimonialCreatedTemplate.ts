import { wrapEmailLayout } from "@/lib/email";
import { platformOrigin } from "@/lib/platform/host-context";

export async function testimonialCreatedTemplate(data: {
  clientName: string;
  serviceName: string;
  rating: number;
  comment: string;
  adminReply?: string;
}) {
  const stars = "★".repeat(data.rating) + "☆".repeat(5 - data.rating);

  const content = `
    <p style="margin:0 0 16px 0;">Poštovani/a <strong>${data.clientName}</strong>,</p>
    <p style="margin:0 0 20px 0;">Hvala što ste podelili vaše iskustvo! Vaša recenzija je primljena i biće objavljena nakon pregleda.</p>
 
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background:linear-gradient(135deg,#fff0f7 0%,#f3f0ff 100%);border-radius:12px;margin:0 0 20px 0;">
      <tr>
        <td style="padding:20px 24px;text-align:center;">
          <p style="margin:0 0 8px 0;font-size:28px;letter-spacing:4px;color:gold;">${stars}</p>
          <p style="margin:0;font-family:'Georgia',serif;font-size:13px;color:#b08db5;letter-spacing:0.5px;">
            Vaša ocena za: <strong style="color:#2d1b40;">${data.serviceName}</strong>
          </p>
          <p><span style="font-weight: bold; color: #5D0156;">Komentar:</span> ${data.comment}</p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:28px 40px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" bgcolor="#7c3aed" style="border-radius:50px;background-color:#7c3aed;padding:14px 36px;mso-padding-alt:14px 36px;">
                <a href="${platformOrigin()}/dashboard?tab=Moje Preporuke" style="display:inline-block;font-family:'Georgia',serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.8px;white-space:nowrap;">
                Pregledaj komentare
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
 
    <p style="margin:0;">Vaše mišljenje nam puno znači. Hvala! ✦</p>
  `;

  return wrapEmailLayout({
    title: "Recenzija primljena",
    content,
  });
}
