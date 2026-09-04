"use client";

/**
 * Ponuda pogodnosti POSLE uspešnog zakazivanja (T1-4 §15).
 *
 * Loyalty NIJE korak u zakazivanju. Prvo termin mora u potpunosti da uspe;
 * tek onda, i samo ako server kaže da stvarno postoji nešto upotrebljivo,
 * korisnica dobija zaseban ekran.
 *
 * Zato ova komponenta:
 *   - ništa ne prikazuje dok server ne potvrdi da ima pogodnosti;
 *   - ništa ne prikazuje ako termin već ima pogodnost (nema stackovanja);
 *   - tiho nestaje na grešci — zakazivanje je već uspelo i njegova potvrda
 *     ne sme da zavisi od nagrada.
 */
import { useState } from "react";
import { useAppointmentBenefits } from "@/hooks/loyalty/useAppointmentBenefits";
import { LoyaltyBenefitPicker } from "./LoyaltyBenefitPicker";
import { shouldOfferBenefits } from "./benefitPresentation";

interface Props {
  appointmentId: string | null;
  onDismiss: () => void;
}

export function LoyaltyBenefitPrompt({ appointmentId, onDismiss }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const { data } = useAppointmentBenefits(appointmentId, {
    enabled: Boolean(appointmentId) && !dismissed,
  });

  const close = () => {
    setDismissed(true);
    onDismiss();
  };

  if (!appointmentId || dismissed) return null;
  // `hasUsable` je serverska odluka: prazan picker se nikad ne otvara.
  if (!shouldOfferBenefits(data)) return null;

  return (
    <LoyaltyBenefitPicker
      appointmentId={appointmentId}
      audience="client"
      onClose={close}
    />
  );
}
