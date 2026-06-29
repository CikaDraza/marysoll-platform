import type { IService, SalonProfileData } from "@/types";
import Y2KHomepageAppointmentWidget from "./Y2KHomepageAppointmentWidget";
import {
  getActiveOrUpcomingVacation,
  formatVacationRange,
} from "@/helpers/vacations";

interface Props {
  tenantSlug?: string;
  clientSlug?: string;
  salon: SalonProfileData;
  services: IService[];
}

/**
 * Y2KBookingCard — wraps the real availability widget in a Y2K card shell
 * (thick ink border, hard hot-pink offset shadow, Bagel heading). Same props as
 * Theme7BookingCard so the Theme-8 layout wires it identically.
 */
export function Y2KBookingCard({
  tenantSlug,
  clientSlug,
  salon,
  services,
}: Props) {
  // Active/upcoming vacation → tilted "ODMOR" sticker in the top-left corner.
  const vacation = getActiveOrUpcomingVacation(salon.vacations);

  return (
    <div
      id="booking"
      className="relative w-full max-w-full overflow-visible rounded-[28px] bg-white text-y2k-ink p-4 sm:p-6 border-[4px] border-y2k-ink shadow-[10px_12px_0_#ff2e97]"
    >
      {vacation && (
        <div className="pointer-events-none absolute -top-16 left-3 z-20 rotate-[-3deg] rounded-2xl border-[3px] border-y2k-ink bg-y2k-ink px-4 py-2.5 text-center text-white shadow-[6px_7px_0_rgba(255,46,151,0.6)]">
          <div className="font-bagel text-2xl leading-none text-y2k-hot">
            ODMOR.
          </div>
          <div className="font-bagel text-lg leading-none mt-1 whitespace-nowrap">
            {formatVacationRange(vacation)}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] font-extrabold text-y2k-pink">
            Reserve your seat
          </div>
          <h3 className="font-bagel text-[28px] leading-[0.95] mt-1">
            Book your slot
          </h3>
        </div>
        <span className="grid place-items-center h-11 w-11 rounded-full border-[3px] border-y2k-ink bg-y2k-pink/10 text-y2k-pink text-lg">
          ★
        </span>
      </div>

      <Y2KHomepageAppointmentWidget
        tenantSlug={tenantSlug}
        clientSlug={clientSlug}
        salon={salon}
        services={services}
      />
    </div>
  );
}
