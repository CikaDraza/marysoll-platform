/**
 * Theme9 BookingCta — primarni CTA teme („Zakaži konsultaciju").
 *
 * Ovo je LAUNCHER (spec 6.11), ne sekcija i ne link ka salonskom booking-u.
 *
 * Otvara PRIKAZ toka (`Theme9BookingProvider`) kada tenant ima podatke; inače
 * ostaje vidljivo ali inertno. Namerno NEMA fallback na `/termini`: ta ruta je
 * salonski Service Booking, a Consultation je zaseban domen. Lažni fallback bi
 * napravio tačno onu prečicu (Marina → Service → Appointment) koju cela ova
 * tema treba da spreči.
 */
import { useBookingLauncher } from "./booking/bookingLauncherContext";
import { ArrowCircle } from "./primitives";

interface Props {
  label?: string;
  /** Prečnik strelice u krugu; `0` je ne renderuje (mobilni, puna širina). */
  arrow?: number;
  className?: string;
}

export function BookingCta({
  label = "Zakaži konsultaciju",
  arrow = 36,
  className = "",
}: Props) {
  const launcher = useBookingLauncher();

  return (
    <button
      type="button"
      onClick={launcher.available ? launcher.open : undefined}
      aria-disabled={launcher.available ? undefined : "true"}
      data-booking-launcher={launcher.available ? "preview" : "pending"}
      title={
        launcher.available
          ? undefined
          : "Zakazivanje konsultacije biće dostupno uskoro."
      }
      className={`group bg-ee-accent text-ee-canvas inline-flex items-center gap-3 rounded-full font-semibold ${launcher.available ? "hover:bg-ee-accent-lift transition-colors" : ""} ${className}`}
    >
      {arrow > 0 && <ArrowCircle size={arrow} />}
      {label}
    </button>
  );
}
