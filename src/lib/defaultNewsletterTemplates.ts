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
  <div style="text-align: center; padding: 40px 20px; font-family: Arial, sans-serif;">
    <h1 style="color: #BA34B7; font-size: 32px;">{{campaignName}}</h1>
    <p style="font-size: 18px; color: #333; max-width: 500px; margin: 20px auto;">
      Poštovana {{clientName}},
    </p>
    <img src="{{mainImage}}" alt="🖼️ slika promocije i ponude" style="max-width: 100%; height: auto; border-radius: 12px; margin: 30px 0;">
    <p style="font-size: 18px; color: #333; max-width: 500px; margin: 20px auto;">
      {{previewText}}
    </p>
    <p style="font-size: 24px; color: #BA34B7; font-weight: bold;">
      {{discount}}
    </p>
    <p style="font-size: 16px; color: #666;">
      Važi od {{startDate}} do {{endDate}}
    </p>
    <a href="{{trackingCtaUrl}}" style="background: #BA34B7; color: white; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; display: inline-block; margin: 30px 0;">
      {{ctaText}}
    </a>
    <p style="text-align: center; color: #999; font-size: 12px; margin-top: 40px;">
      Ako više ne želite da primate naše novosti, 
      <a href="{{unsubscribeUrl}}" style="color: #999; text-decoration: underline;">odjavite se ovde</a>.
    </p>
    <img src="{{trackingOpenUrl}}" width="1" height="1" style="display:none !important;" />
  </div>
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
      <div style="text-align: center; padding: 20px;">
        <h1 style="color: #BA34B7; font-size: 28px; text-align: center;">Šta je novo kod nas?</h1>
        <p style="font-size: 18px; color: #333; text-align: center;">
          Drage klijentkinje, imamo uzbudljive vesti!
        </p>
        <div style="background: #f8f8f8; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <h2 style="color: #BA34B7;">{{title}}</h2>
          <p style="text-align: justify; font-size: 16px; line-height: 1.6;">
            {{body}}
          </p>
          <img src="{{mainImage}}" alt="🖼️ slika novosti u salonu" style="max-width: 100%; height: auto; border-radius: 8px; margin-top: 15px;">
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{trackingCtaUrl}}" style="background: #BA34B7; color: white; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; display: inline-block; margin: 30px 0;">
            {{ctaText}}
          </a>
        </div>
        <p style="text-align: center; color: #999; font-size: 12px; margin-top: 40px;">
          Ako više ne želite da primate naše novosti, 
          <a href="{{unsubscribeUrl}}" style="color: #999; text-decoration: underline;">odjavite se ovde</a>.
        </p>
        <img src="{{trackingOpenUrl}}" width="1" height="1" style="display:none !important;" />
      </div>
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
      <div style="margin: 0 auto; max-width: 500px; text-align: center; padding: 20px;">
        <h1 style="color: #BA34B7; font-size: 28px; text-align: center;">Beauty trendovi i saveti</h1>
        <p style="font-size: 18px; color: #333; text-align: center;">
          Naučite nešto novo za Vašu lepotu
        </p>
        <img src="{{mainImage}}" alt="🖼️ slika saveti i trendovi" style="max-width: 100%; height: auto; border-radius: 12px; margin: 20px 0;">
        <h2 style="color: #BA34B7; font-size: 22px;">{{title}}</h2>
        <p style="text-align: justify; font-size: 16px; line-height: 1.8; color: #444;">
          {{body}}
        </p>
        <h3 style="color: #BA34B7; font-size: 18px;">{{subtitle}}</h3>
        <ul style="text-align: justify; padding-left: 20px; margin: 20px 0;">
          <li style="margin-bottom: 10px;">{{itemOne}}</li>
          <li style="margin-bottom: 10px;">{{itemTwo}}</li>
          <li style="margin-bottom: 10px;">{{itemThree}}</li>
        </ul>
        <small style="font-size: 12px; line-height: 1.8; color: #666;">Nastavak teksta pogledajte na nasem sajtu</small>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{trackingCtaUrl}}" style="background: #BA34B7; color: white; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; display: inline-block; margin: 30px 0;">
            {{ctaText}}
          </a>
        </div>
        <p style="text-align: center; color: #999; font-size: 12px; margin-top: 40px;">
          Ako više ne želite da primate naše novosti, 
          <a href="{{unsubscribeUrl}}" style="color: #999; text-decoration: underline;">odjavite se ovde</a>.
        </p>
        <img src="{{trackingOpenUrl}}" width="1" height="1" style="display:none !important;" />
      </div>
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
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; max-width= 780px">
                    <tr>
                        <td align="center" style="padding: 26px 0; background-color: #5D0156; border-radius: .75rem; color: #ffffff; font-family: Arial, sans-serif; font-size: 24px;">
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
                                                <td align="center" style="border-radius: 3px;" bgcolor="#BA34B7">
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
