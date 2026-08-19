import { wrapEmailLayout } from "@/lib/email";

export async function emailVerificationTemplate(data: {
  clientName: string;
  verificationUrl: string;
  ctaLabel: string;
}) {
  const content = `
    <p style="margin:0 0 16px 0;">Poštovani/a <strong>${data.clientName}</strong>,</p>
    <p style="margin:0 0 20px 0;">Hvala što ste se registrovali! Molimo vas da potvrdite vašu email adresu klikom na dugme ispod.</p>
 
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background:linear-gradient(135deg,#fff0f7 0%,#f3f0ff 100%);border-radius:12px;margin:0 0 20px 0;">
      <tr>
        <td align="center" style="padding:28px 40px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" bgcolor="#7c3aed" style="border-radius:50px;background-color:#7c3aed;padding:14px 36px;mso-padding-alt:14px 36px;">
                <a href="${data.verificationUrl}" style="display:inline-block;font-family:'Georgia',serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.8px;white-space:nowrap;">
                  Potvrdi te registraciju
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
 
    <p style="margin:0 0 12px 0;font-size:13px;color:#9089b0;font-style:italic;">
      Link je važeći 24 sata. Ako niste zatražili verifikaciju, ignorišite ovaj mejl.
    </p>
    <p style="margin:0;">Dobrodošli! ✦</p>
  `;

  return wrapEmailLayout({
    title: "Potvrdite email adresu",
    content,
  });
}
