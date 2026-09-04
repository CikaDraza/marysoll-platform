"use client";
/**
 * BookingModalBody — sadržaj modala, u jednom ili dva koraka.
 *
 * Usluga bez zahteva ostaje na jednom ekranu. Usluga koju je salon podesio da
 * traži zahtev dobija drugi korak — „Kako želite da izgleda?" — do kojeg se
 * stiže dugmetom „Sledeće". Zahtev se tako ne gura pred klijentkinju pre nego
 * što uopšte izabere šta radi.
 */
import { GuestContactForm } from "./GuestContactForm";
import { BookingDateTimeSection } from "./BookingDateTimeSection";
import { BookingServiceSection } from "./BookingServiceSection";
import { BookingIntakeSection } from "./BookingIntakeSection";
import { BookingNoteField } from "./BookingNoteField";
import { BookingActions } from "./BookingActions";
import { useBookingContext } from "./BookingProvider";

export function BookingModalBody() {
  const { intakeRequired, onIntakeStep } = useBookingContext();

  if (intakeRequired && onIntakeStep) {
    return (
      <>
        {/* Gost se identifikuje na OVOM koraku, jer odavde i potvrđuje —
            bez forme bi „Zakaži kao gost" ostalo bez podataka. */}
        <GuestContactForm />
        <BookingIntakeSection />
        <BookingNoteField />
        <BookingActions />
      </>
    );
  }

  return (
    <>
      <GuestContactForm />
      <BookingDateTimeSection />
      <BookingServiceSection />
      {/* Bez zahteva nema drugog koraka — beleška ostaje ovde. */}
      {!intakeRequired && <BookingNoteField />}
      <BookingActions />
    </>
  );
}
