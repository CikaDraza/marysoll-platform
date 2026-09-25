import { formatVoucherPrice } from "@/helpers/theme8Voucher";
import { wrapEmailLayout } from "@/lib/email/wrapEmailLayout";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function voucherRequestTemplate(input: {
  purchaserName: string;
  purchaserInstagram: string;
  recipientName: string;
  serviceName: string;
  servicePriceAtRequest: number;
  requestCode: string;
}): Promise<string> {
  const rows = [
    ["Od", input.purchaserName],
    ["Instagram", input.purchaserInstagram],
    ["Za", input.recipientName],
    ["Tehnika", input.serviceName],
    ["Trenutna cena", formatVoucherPrice(input.servicePriceAtRequest)],
    ["Plaćanje", "Lično u salonu"],
    ["Preuzimanje", "Lično u salonu"],
    ["Vaučer", "Bez vremenskog ograničenja"],
    ["Zahtev", input.requestCode],
  ];
  const content = `<h1 style="font-size:24px;color:#0b0b0f;">🎁 NOVI ZAHTEV ZA VAUČER</h1>
    <p>Ovo je zahtev za kupovinu poklon vaučera; vaučer se izdaje nakon dogovora i plaćanja.</p>
    <table role="presentation" style="border-collapse:collapse;width:100%;">${rows.map(([label, value]) =>
      `<tr><th scope="row" style="padding:9px;text-align:left;border-bottom:1px solid #eee;">${escapeHtml(label)}</th><td style="padding:9px;border-bottom:1px solid #eee;">${escapeHtml(value)}</td></tr>`
    ).join("")}</table>`;
  return wrapEmailLayout({ title: `Poklon vaučer ${input.requestCode}`, content });
}
