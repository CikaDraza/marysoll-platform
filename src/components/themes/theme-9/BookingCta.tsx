/**
 * Theme9 BookingCta — primarni CTA teme („Zakaži konsultaciju").
 *
 * Ovo je LAUNCHER (spec 6.11), ne sekcija i ne link ka salonskom booking-u.
 *
 * DOK EXPERT BOOKING FLOW NE STIGNE (Slice 4/7) DUGME JE INERTNO. Namerno NEMA
 * fallback na `/termini`: ta ruta je salonski Service Booking, a Consultation je
 * zaseban domen. Lažni fallback bi u produkciji napravio tačno onu prečicu
 * (Marina → Service → Appointment) koju cela ova tema treba da spreči.
 *
 * Kada launcher dobije `CtaAction: { kind: "open-widget" }`, ovde se dodaje
 * `href` + `onClick` i dugme prestaje da bude inertno.
 */
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
  return (
    <button
      type="button"
      aria-disabled="true"
      data-booking-launcher="pending"
      title="Zakazivanje konsultacije biće dostupno uskoro."
      className={`group bg-ee-accent text-ee-canvas inline-flex items-center gap-3 rounded-full font-semibold ${className}`}
    >
      {arrow > 0 && <ArrowCircle size={arrow} />}
      {label}
    </button>
  );
}
