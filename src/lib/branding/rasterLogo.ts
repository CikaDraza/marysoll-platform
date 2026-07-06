/**
 * usableRasterLogo — jedan izvor istine za "sme li ovaj logo u push/email".
 *
 * Web push ne renderuje SVG ikone (browser prikaže uzvičnik), a ni email
 * klijenti (Gmail/Outlook) ne renderuju SVG u <img> — zato notifikacije i
 * mejlovi smeju da koriste samo raster logo (PNG/JPG/WebP). Upload za
 * notificationLogo je već ograničen na raster; guard štiti od starih SVG
 * vrednosti u bazi i od logo-a sajta (koji sme da bude SVG).
 */
export function usableRasterLogo(url: unknown): url is string {
  return (
    typeof url === "string" && url.trim() !== "" && !/\.svg(\?|#|$)/i.test(url)
  );
}
