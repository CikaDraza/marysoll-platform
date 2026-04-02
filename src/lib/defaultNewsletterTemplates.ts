// lib/defaultNewsletterTemplates.ts
import { INewsletterTemplate } from "@/types";
import { standardNewsletterVariables } from "./standardNewsletterVariables";

export const defaultNewsletterTemplates: Omit<
  INewsletterTemplate,
  "_id" | "createdAt" | "updatedAt"
>[] = [
  {
    name: "Promocije i ponude",
    slug: "default-promotions",
    isDefault: true,
    subject: "🎁 Specijalna ponuda samo za Vas!",
    isActive: false,
    hasVariables: true,
    variables: standardNewsletterVariables,
    htmlTemplate: `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="font-family: Arial, sans-serif;">

      <h1 style="color:#BA34B7;font-size:28px;margin:0 0 16px 0;">
        {{campaignName}}
      </h1>

      <p style="font-size:16px;color:#333;margin:0 0 20px 0;">
        Poštovana {{clientName}},
      </p>

      <img src="{{mainImage}}" alt="" width="100%" style="max-width:480px;height:auto;border-radius:12px;margin:20px 0;display:block;" />

      <p style="font-size:16px;color:#333;margin:20px 0;">
        {{previewText}}
      </p>

      <p style="font-size:22px;color:#BA34B7;font-weight:bold;margin:10px 0;">
        {{discount}}
      </p>

      <p style="font-size:14px;color:#666;margin:10px 0 30px 0;">
        Važi od {{startDate}} do {{endDate}}
      </p>

      <!-- CTA BUTTON -->
      <table role="presentation" cellspacing="0" cellpadding="0" align="center">
        <tr>
          <td bgcolor="#BA34B7" style="border-radius:8px;">
            <a href="{{trackingCtaUrl}}" 
              style="font-size:16px;font-family:Arial,sans-serif;color:#ffffff;text-decoration:none;padding:16px 36px;display:inline-block;">
              {{ctaText}}
            </a>
          </td>
        </tr>
      </table>

      <p style="color:#999;font-size:12px;margin-top:40px;">
        Ako više ne želite da primate naše novosti,
        <a href="{{unsubscribeUrl}}" style="color:#999;text-decoration:underline;">
          odjavite se ovde
        </a>.
      </p>

      <img src="{{trackingOpenUrl}}" width="1" height="1" style="display:none;" />

    </td>
  </tr>
</table>
`,
  },
  {
    name: "Novosti i ažuriranja",
    isDefault: true,
    slug: "default-news",
    subject: "🔔 Novosti iz Marysoll salona",
    hasVariables: true,
    variables: standardNewsletterVariables,
    isActive: false,
    htmlTemplate: `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">

<tr>
<td style="font-family: Arial, sans-serif;">

<h1 style="color:#BA34B7;font-size:26px;margin-bottom:16px;">
Šta je novo kod nas?
</h1>

<p style="font-size:16px;color:#333;margin-bottom:20px;">
Drage klijentkinje, imamo uzbudljive vesti!
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f8;border-radius:12px;">
<tr>
<td style="padding:20px;">

<h2 style="color:#BA34B7;margin-bottom:12px;">
{{title}}
</h2>

<p style="font-size:15px;line-height:1.6;margin-bottom:16px;">
{{body}}
</p>

<img src="{{mainImage}}" width="100%" style="max-width:480px;border-radius:8px;display:block;" />

</td>
</tr>
</table>

<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin-top:30px;">
<tr>
<td bgcolor="#BA34B7" style="border-radius:8px;">
<a href="{{trackingCtaUrl}}"
style="font-size:16px;font-family:Arial;color:#ffffff;text-decoration:none;padding:16px 36px;display:inline-block;">
{{ctaText}}
</a>
</td>
</tr>
</table>

<p style="color:#999;font-size:12px;margin-top:40px;text-align:center;">
Ako više ne želite da primate naše novosti,
<a href="{{unsubscribeUrl}}" style="color:#999;text-decoration:underline;">
odjavite se ovde
</a>.
</p>

<img src="{{trackingOpenUrl}}" width="1" height="1" style="display:none;" />

</td>
</tr>
</table>
`,
  },
  {
    name: "Saveti i trendovi",
    slug: "default-tips",
    isDefault: true,
    hasVariables: true,
    variables: standardNewsletterVariables,
    isActive: false,
    subject: "💡 Beauty savet meseca",
    htmlTemplate: `
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:500px;margin:0 auto;">
  <tr>
    <td align="center" style="padding:20px;font-family:Arial,sans-serif;">

      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">

        <tr>
          <td align="center" style="color:#BA34B7;font-size:28px;font-weight:bold;padding-bottom:10px;">
            Beauty trendovi i saveti
          </td>
        </tr>

        <tr>
          <td align="center" style="font-size:18px;color:#333;padding-bottom:20px;">
            Naučite nešto novo za Vašu lepotu
          </td>
        </tr>

        <tr>
          <td align="center" style="padding-bottom:20px;">
            <img src="{{mainImage}}" alt="slika saveti i trendovi"
              width="460"
              style="width:100%;max-width:460px;height:auto;border-radius:12px;display:block;">
          </td>
        </tr>

        <tr>
          <td align="center" style="color:#BA34B7;font-size:22px;font-weight:bold;padding-bottom:10px;">
            {{title}}
          </td>
        </tr>

        <tr>
          <td style="font-size:16px;line-height:1.8;color:#444;text-align:left;padding-bottom:20px;">
            {{body}}
          </td>
        </tr>

        <tr>
          <td align="center" style="color:#BA34B7;font-size:18px;font-weight:bold;padding-bottom:10px;">
            {{subtitle}}
          </td>
        </tr>

        <tr>
          <td style="font-size:16px;color:#444;line-height:1.6;padding-bottom:20px;">
            • {{itemOne}}<br>
            • {{itemTwo}}<br>
            • {{itemThree}}
          </td>
        </tr>

        <tr>
          <td align="center" style="font-size:12px;color:#666;line-height:1.8;padding-bottom:20px;">
            Nastavak teksta pogledajte na našem sajtu
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:20px 0;">
            <table role="presentation" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" bgcolor="#BA34B7" style="border-radius:6px;">
                  <a href="{{trackingCtaUrl}}"
                    style="font-size:18px;font-family:Arial,sans-serif;color:#ffffff;text-decoration:none;padding:16px 36px;display:inline-block;">
                    {{ctaText}}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td align="center" style="font-size:12px;color:#999;padding-top:20px;">
            Ako više ne želite da primate naše novosti,
            <a href="{{unsubscribeUrl}}" style="color:#999;text-decoration:underline;">odjavite se ovde</a>.
          </td>
        </tr>

      </table>

      <img src="{{trackingOpenUrl}}" width="1" height="1" style="display:none !important;" />

    </td>
  </tr>
</table>
`,
  },
  {
    name: "Saradnja i dogadjaji",
    slug: "default-events",
    isDefault: true,
    hasVariables: true,
    variables: standardNewsletterVariables,
    isActive: false,
    subject: "🎉 Ne propustite dogadjaj sa Marysoll makeup",
    htmlTemplate: `
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td>
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; max-width:780px">
                    <tr>
                        <td align="center" style="padding: 26px 0; background-color: #FFF4FE; border-radius: .75rem; color: #272727; font-family: Arial, sans-serif; font-size: 24px;">
                            🎉{{title}}🎉
                        </td>
                    </tr>
                    <tr>
                        <td bgcolor="#ffffff" style="padding: 30px 30px 30px 30px; border-bottom: 1px solid #f0f0f0;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="color: #153643; font-family: Arial, sans-serif; font-size: 16px; line-height: 22px;">
                                        <p style="margin: 0;">{{previewText}}</p>
                                        <p style="margin: 15px 0;">Čekaju vas:<br>
                                            - Novogodišnja muzika 🎶<br>
                                            - Zabava za sve uzraste 👨‍👩<br>
                                            - Topla čokolada i poslastice ☕<br>
                                            - I još mnogo toga! 🎁
                                        </p>
                                        <p style="margin: 15px 0;"><strong>Vreme i Datum:</strong> {{startEvent}}<br>
                                            <strong>Lokacija:</strong> {{location}}<br>
                                            <strong>Ulaz: </strong> {{tickets}}
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 20px 0 0 0;">
                                        <table border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td align="center" style="border-radius: 3px; display:inline-block; line-height:100%;" bgcolor="#BA34B7">
                                                  <a href="{{trackingCtaUrl}}" style="font-size: 16px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; color: #ffffff; text-decoration: none; padding: 12px 18px; border: 1px solid #BA34B7; display: inline-block;">
                                                    {{ctaText}}
                                                  </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td bgcolor="#ffffff" style="padding: 30px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="color: #153643; font-family: Arial, sans-serif; font-size: 14px;">
                                        <p style="margin: 0;">Žurku sponzoriše:</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding-top: 10px;">
                                      <p style="margin: 0; color: #BA34B7;">Marysoll Makeup & Nails Salon</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
      </table>
    `,
  },
];
