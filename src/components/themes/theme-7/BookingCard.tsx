import type { IService, SalonProfileData } from "@/types";
import HomepageAppointmentWidget from "../shared/HomepageAppointmentWidget";

interface Props {
  tenantSlug?: string;
  clientSlug?: string;
  salon: SalonProfileData;
  services: IService[];
}

/**
 * Theme7BookingCard — wraps the real availability widget in a Lash-Room card shell.
 * The widget's accent reads --primary-color, which the theme-7 root forces to neon.
 */
export function Theme7BookingCard({
  tenantSlug,
  clientSlug,
  salon,
  services,
}: Props) {
  return (
    <div
      id="booking"
      className="relative w-full max-w-full overflow-hidden rounded-[28px] bg-paper text-ink p-4 sm:p-6 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.55)] ring-1 ring-black/5"
    >
      <div className="absolute inset-0 rounded-[28px] ring-1 ring-inset ring-neon/20 pointer-events-none" />
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-ink/45">
            Reserve your seat
          </div>
          <h3 className="font-cormorant text-2xl mt-1">
            Book your appointment
          </h3>
        </div>
        <span className="grid place-items-center h-10 w-10 rounded-full bg-neon/10 text-neon text-lg">
          ★
        </span>
      </div>

      <HomepageAppointmentWidget
        tenantSlug={tenantSlug}
        clientSlug={clientSlug}
        salon={salon}
        services={services}
      />
    </div>
  );
}
