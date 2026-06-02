import "server-only";

/**
 * Notifies the booking app (booking.marysoll.com) that marketplace data
 * (salon visibility / city popularity) changed, so it can drop its city/salon
 * caches without waiting for the CDN TTL.
 *
 * No-op when BOOKING_REVALIDATE_URL / BOOKING_REVALIDATE_SECRET are not set —
 * the short s-maxage on the marketplace endpoints is the fallback.
 */
export async function revalidateMarketplaceCaches(): Promise<void> {
  const url = process.env.BOOKING_REVALIDATE_URL;
  const secret = process.env.BOOKING_REVALIDATE_SECRET;
  if (!url || !secret) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ tags: ["marketplace-cities", "marketplace-salons"] }),
      // Fire-and-forget; never block the superadmin response on this.
      cache: "no-store",
    });
  } catch (err) {
    console.error("[revalidateMarketplaceCaches] failed:", err);
  }
}
