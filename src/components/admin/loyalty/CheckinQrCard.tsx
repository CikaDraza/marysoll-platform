"use client";

/**
 * Admin QR za check-in — salon štampa/ističe QR, klijent ga skenira telefonom
 * i beleži dolazak (/checkin na javnom domenu salona). Phase 1 dopuna.
 *
 * URL je HOST-based (custom domen ili {slug}.marysoll.com) jer je path-based
 * check-in blokiran u produkciji (proxy IS_PROD gate).
 */
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";

export function CheckinQrCard() {
  const { tenant } = useTenantAdmin();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const checkinUrl = tenant?.slug
    ? `https://${
        tenant.customDomain && tenant.customDomainVerified
          ? tenant.customDomain
          : `${tenant.slug}.${BASE_DOMAIN}`
      }/checkin`
    : null;

  useEffect(() => {
    if (!checkinUrl) return;
    let cancelled = false;
    QRCode.toDataURL(checkinUrl, { width: 320, margin: 2 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        /* QR nije kritičan — URL ostaje vidljiv kao fallback */
      });
    return () => {
      cancelled = true;
    };
  }, [checkinUrl]);

  if (!checkinUrl) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
      <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
        QR za check-in
      </p>
      <p className="text-[11px] text-gray-400 mb-3">
        Odštampajte i istaknite u salonu — klijenti skeniraju telefonom i beleže
        dolazak.
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="rounded-xl bg-white p-2 shadow-sm border border-gray-100">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt="QR kod za check-in"
              width={160}
              height={160}
              className="block"
            />
          ) : (
            <div className="w-40 h-40 bg-gray-100 animate-pulse rounded" />
          )}
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <code className="block text-xs text-violet-700 dark:text-violet-300 break-all mb-3">
            {checkinUrl}
          </code>
          {qrDataUrl && (
            <a
              href={qrDataUrl}
              download="marysoll-checkin-qr.png"
              className="inline-block rounded-lg bg-gray-900 dark:bg-gray-700 text-white text-xs font-semibold px-4 py-2 hover:opacity-90 transition"
            >
              Preuzmi QR
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
