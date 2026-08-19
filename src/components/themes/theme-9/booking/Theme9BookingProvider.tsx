"use client";
/**
 * Theme9BookingProvider — montira launcher i dijalog jednom po strani.
 *
 * Dijalog se renderuje kroz portal na `body`, da ga nijedan `overflow` ili
 * `transform` roditelj ne iseče.
 */
import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { ThemeBookingPreview } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { BookingLauncherContext } from "./bookingLauncherContext";
import { Theme9BookingDialog } from "./Theme9BookingDialog";

interface Props {
  data?: ThemeBookingPreview;
  tenantSlug?: string;
  children: React.ReactNode;
}

export function Theme9BookingProvider({ data, tenantSlug, children }: Props) {
  const [open, setOpen] = useState(false);
  const { isLoggedIn } = useAuth();

  const available = Boolean(data?.enabled && data.dates.length > 0);

  const launcher = useMemo(
    () => ({ available, open: () => setOpen(true) }),
    [available],
  );

  const close = useCallback(() => setOpen(false), []);

  return (
    <BookingLauncherContext.Provider value={launcher}>
      {children}
      {open &&
        data &&
        typeof document !== "undefined" &&
        createPortal(
          <Theme9BookingDialog
            data={data}
            /**
             * PRIKAZ: ulogovana klijentkinja se tretira kao povratnica, da se
             * vidi kratak check-in umesto pune ankete. Stvarno prepoznavanje
             * traži istoriju termina — to je posao Booking domena, ne teme.
             */
            returningClient={Boolean(isLoggedIn)}
            tenantSlug={tenantSlug}
            onClose={close}
          />,
          document.body,
        )}
    </BookingLauncherContext.Provider>
  );
}
