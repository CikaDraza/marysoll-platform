export function isInstagramDmLink(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && url.hostname === "ig.me" &&
      /^\/m\/[A-Za-z0-9._]{1,30}\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

export function instagramDmUrl(instagram: string | undefined): string | null {
  if (!instagram) return null;
  const value = instagram.trim();
  let handle = value.replace(/^@/, "");
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const url = new URL(value);
      if (!["instagram.com", "www.instagram.com", "ig.me"].includes(url.hostname)) return null;
      handle = url.hostname === "ig.me"
        ? url.pathname.match(/^\/m\/([^/]+)/)?.[1] ?? ""
        : url.pathname.split("/").filter(Boolean)[0] ?? "";
    } catch {
      return null;
    }
  }
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? `https://ig.me/m/${handle}` : null;
}

export function formatVoucherPrice(price: number): string {
  return `${new Intl.NumberFormat("sr-RS", { maximumFractionDigits: 0 }).format(price)} RSD`;
}

export function voucherDmMessage(input: {
  greetingName: string;
  purchaserName: string;
  recipientName: string;
  serviceName: string;
  requestCode: string;
}): string {
  return `Ćao ${input.greetingName} ♡\nPoslala sam zahtev za poklon vaučer.\n\nOd: ${input.purchaserName}\nZa: ${input.recipientName}\nTehnika: ${input.serviceName}\nZahtev: ${input.requestCode}`;
}
