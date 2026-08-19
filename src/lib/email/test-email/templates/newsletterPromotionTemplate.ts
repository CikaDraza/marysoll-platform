import { wrapEmailLayout } from "@/lib/email";
import { platformOrigin } from "@/lib/platform/host-context";

export async function newsletterPromotionTemplate(data: {
  clientName: string;
  subject: string;
  content: string;
  ctaUrl?: string;
  ctaLabel?: string;
  unsubscribeUrl: string;
  trackingData?: {
    campaignId: string;
    subscriberId: string;
  };
}) {
  const trackingPixel = data.trackingData
    ? `<img alt="" style="display:none" src="${platformOrigin()}/api/newsletter/track/open?campaign=${data.trackingData.campaignId}&subscriber=${data.trackingData.subscriberId}" width="1" height="1" />`
    : "";
  const content = `
    <p style="margin:0 0 16px 0;">Poštovani/a <strong>${data.clientName}</strong>,</p>

    ${data.content}

    <table role="actions" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:36px 0 0 0;">
      <tr>
        <td align="center">
          <p>
            <a href="${data.unsubscribeUrl}" style="color: #ff0000;">
              Otkaži pretplatu
            </a> | 
            <a style="color: #5D0156;" href="${
              platformOrigin()
            }/cookie-policy#open-preferences">
              Podesi preferencije
            </a>
          </p>
        </td>
      </tr>
    </table>
    ${trackingPixel}
  `;

  return wrapEmailLayout({
    title: data.subject,
    content,
  });
}
