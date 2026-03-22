import "server-only";
/**
 * lib/email/wrapEmailLayout.ts
 *
 * Production HTML email layout wrapper.
 * Dynamically fetches salon profile data from DB and wraps inner content.
 *
 * Used by ALL transactional email templates.
 * Replaces the old static base() function in templates.ts.
 *
 * Accepts:
 *   title   — email <title> and preheader reference
 *   content — inner HTML (from individual template functions)
 *
 * Optionally accepts salonOverride to avoid a DB call when
 * salon data is already available in the calling context.
 */

import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";

export interface EmailLayoutData {
  title: string;
  content: string;
}

interface SalonData {
  name?: string;
  description?: string;
  logo?: string | null;
  street?: string;
  city?: string;
  phone?: string;
  social?: {
    instagram?: string;
    tiktok?: string;
    facebook?: string;
  };
}

export async function wrapEmailLayout(
  data: EmailLayoutData,
  salonOverride?: SalonData
): Promise<string> {
  let salon: SalonData | null = salonOverride ?? null;

  if (!salon) {
    try {
      await connectToDB();
      const raw = await SalonProfile.findOne().lean() as Record<string, unknown> | null;
      if (raw) {
        salon = {
          name: String(raw.name ?? ""),
          description: String(raw.description ?? ""),
          logo: raw.logo ? String(raw.logo) : null,
          street: String(raw.street ?? ""),
          city: String(raw.city ?? ""),
          phone: String(raw.phone ?? ""),
          social: {
            instagram: String((raw.social as Record<string, string>)?.instagram ?? ""),
            tiktok: String((raw.social as Record<string, string>)?.tiktok ?? ""),
            facebook: String((raw.social as Record<string, string>)?.facebook ?? ""),
          },
        };
      }
    } catch {
      // If DB fetch fails, continue with null salon (graceful degradation)
    }
  }

  const salonName = salon?.name || "Marysoll";
  const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://marysoll.com";

  return `<!DOCTYPE html>
<html lang="sr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>${data.title}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style type="text/css">
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    a { text-decoration: none; }

    @media only screen and (max-width: 600px) {
      .email-wrapper { width: 100% !important; padding: 0 !important; }
      .email-container { width: 100% !important; border-radius: 0 !important; }
      .header-cell { padding: 32px 24px 24px 24px !important; }
      .content-cell { padding: 28px 24px !important; }
      .footer-cell { padding: 20px 24px 28px 24px !important; }
      .divider-cell { padding: 0 24px !important; }
      .logo-img { width: 150px !important; max-width: 150px !important; }
      .salon-name { font-size: 22px !important; }
      .tagline { font-size: 12px !important; }
    }
    @media only screen and (max-width: 480px) {
      .header-cell { padding: 24px 16px 20px 16px !important; }
      .content-cell { padding: 24px 16px !important; }
      .footer-cell { padding: 16px 16px 24px 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#fdf5f9;font-family:'Georgia',serif;-webkit-font-smoothing:antialiased;">

  <div style="display:none;font-size:1px;color:#fdf5f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${salonName} — ${data.title}
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#fdf5f9;">
    <tr>
      <td align="center" valign="top" style="padding:40px 16px;" class="email-wrapper">

        <!-- Top accent bar -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;" class="email-container">
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#ff80b5 0%,#9089fc 50%,#ff80b5 100%);border-radius:12px 12px 0 0;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
        </table>

        <!-- Main card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600"
          style="max-width:600px;background-color:#ffffff;border-radius:0 0 16px 16px;box-shadow:0 8px 48px rgba(144,137,252,0.10),0 2px 12px rgba(255,128,181,0.08);"
          class="email-container">

          <!-- HEADER -->
          <tr>
            <td align="center" valign="top" style="padding:44px 40px 32px 40px;background-color:#ffffff;" class="header-cell">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:20px;">
                    ${salon?.logo
                      ? `<img src="${salon.logo}" width="200" alt="${salonName}" class="logo-img" style="display:block;max-width:200px;height:auto;border:0;outline:none;text-decoration:none;">`
                      : `<table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td align="center" style="width:64px;height:64px;background:linear-gradient(135deg,#ff80b5 0%,#9089fc 100%);border-radius:50%;"><span style="font-size:28px;line-height:64px;display:block;">✦</span></td></tr></table>`
                    }
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:6px;">
                    <h1 class="salon-name" style="margin:0;font-family:'Georgia',serif;font-size:26px;font-weight:700;color:#1a1025;letter-spacing:-0.3px;line-height:1.2;">
                      ${salonName}
                    </h1>
                  </td>
                </tr>
                ${salon?.description ? `
                <tr>
                  <td align="center">
                    <p class="tagline" style="margin:0;font-family:'Georgia',serif;font-size:11px;color:#b08db5;letter-spacing:2.5px;text-transform:uppercase;font-style:italic;">
                      ${salon.description}
                    </p>
                  </td>
                </tr>` : ""}
              </table>
            </td>
          </tr>

          <!-- Gradient divider -->
          <tr>
            <td style="padding:0 40px;" class="divider-cell">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="height:1px;background:linear-gradient(90deg,transparent 0%,#ff80b5 30%,#9089fc 70%,transparent 100%);font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td valign="top" style="padding:36px 40px 8px 40px;" class="content-cell">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-family:'Georgia',serif;font-size:15px;line-height:1.75;color:#3d2952;">
                    ${data.content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="height:24px;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Footer divider -->
          <tr>
            <td style="padding:0 40px;" class="divider-cell">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="height:1px;background-color:#f0e8f4;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td valign="top" style="padding:24px 40px 36px 40px;" class="footer-cell">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:14px;">
                    <a href="${appUrl}/cookie-policy#open-preferences"
                      style="font-family:'Georgia',serif;font-size:12px;color:#9089fc;text-decoration:underline;letter-spacing:0.3px;">
                      Podesi preferencije obaveštenja
                    </a>
                  </td>
                </tr>

                ${salon?.social && (salon.social.instagram || salon.social.tiktok || salon.social.facebook) ? `
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        ${salon.social.instagram ? `<td style="padding:0 6px;"><a href="${salon.social.instagram}" style="display:inline-block;width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#ff80b5,#9089fc);text-align:center;line-height:30px;font-size:14px;color:#ffffff;">✦</a></td>` : ""}
                        ${salon.social.tiktok ? `<td style="padding:0 6px;"><a href="${salon.social.tiktok}" style="display:inline-block;width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#ff80b5,#9089fc);text-align:center;line-height:30px;font-size:14px;color:#ffffff;">✦</a></td>` : ""}
                        ${salon.social.facebook ? `<td style="padding:0 6px;"><a href="${salon.social.facebook}" style="display:inline-block;width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#9089fc,#ff80b5);text-align:center;line-height:30px;font-size:14px;color:#ffffff;">✦</a></td>` : ""}
                      </tr>
                    </table>
                  </td>
                </tr>` : ""}

                <tr>
                  <td align="center" style="padding-bottom:8px;">
                    <p style="margin:0;font-family:'Georgia',serif;font-size:11px;color:#b0a0bc;line-height:1.6;letter-spacing:0.2px;">
                      ${[salon?.street, salon?.city, salon?.phone].filter(Boolean).join(" · ")}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:4px;">
                    <p style="margin:0;font-family:'Georgia',serif;font-size:11px;color:#c8b8d0;letter-spacing:0.2px;">
                      &copy; ${new Date().getFullYear()} ${salonName}. Sva prava zadržana.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Bottom accent bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#9089fc 0%,#ff80b5 50%,#9089fc 100%);border-radius:0 0 16px 16px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
