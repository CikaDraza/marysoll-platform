"use client";
/**
 * useBookingFlow — orkestracija UI-ja zakazivanja.
 *
 * Ovo je BOOKING UI sloj iz T3 podele (docs/TODO.md): drži izbor, korak,
 * odgovore i draft. NIJE Booking Engine i ne sme to da postane — ne računa
 * dostupnost, ne zaključava termin i ne odlučuje da li je rezervacija validna.
 * Kada engine stigne, `submit` prestaje da bude preview poziv i postaje
 * `BookingEngine.reserve(...)`, a sve ostalo ostaje.
 *
 * `mode`:
 *   "preview" — ništa se ne upisuje; slanje samo šalje mejl vlasnici i
 *               superadminu, da vlasnica prođe tok i potvrdi sadržaj.
 *   (kasnije) "live" — pravi upis kroz engine.
 *
 * Draft živi ceo session dijaloga: `back` je pravi workflow back, ne restart —
 * povratak na anketu čuva odgovore, povratak na termin čuva ponudu.
 *
 * REDOSLED JE OFFERING-FIRST: ponuda → termin → upitnik → pregled. Nije
 * kozmetika. Tek kad je ponuda poznata, poznati su trajanje i resurs, pa
 * availability uopšte može da odgovori koji su termini stvarno slobodni. Dok
 * prikaz nudi fiksne probne datume razlika se ne vidi, ali kad `availability-core`
 * stigne (docs/TODO.md, Slice 3) tok se ne menja — samo izvor termina.
 *
 * NAZIVI: `offering`, ne `service`. Consultation je zaseban domen (Slice 7) i
 * ne sme se svesti na salonsku uslugu preko privremenog prikaza.
 *
 * UGOVOR ZA KASNIJE — `initialOfferingId`: CTA sa kartice pojedinačne ponude
 * („Individualna konsultacija · Zakaži") ulazi u tok sa već poznatom ponudom i
 * preskače korak 01, dok generički CTA („Zakaži konsultaciju") počinje od
 * njega. Isti hook, drugo ulazno stanje — nikad drugi tok. Nije implementirano
 * jer takav CTA još ne postoji.
 *
 * `initialOfferingId` INICIJALIZUJE STANJE, ne beleži ništa: ni booking, ni
 * hold, ni rezervaciju. Zato se korak 01 ne prikazuje — poznato je samo šta
 * korisnica želi da zakaže.
 *
 * UGOVOR ZA KASNIJE — `preferredDate` / `preferredStartTime`: theme-9 finalCta
 * ulazi sa željenim danom i terminom, ali BEZ ponude. Ta preferenca NE sme da
 * preskoči korak 02: trajanje ponude odlučuje da li je uopšte validna (15:00
 * prolazi za 60 i 120 minuta, ne i za 180). Ulazi kao predizbor koji se
 * validira; ako ne prođe, tok to kaže i nudi najbliže slobodno vreme, umesto da
 * tiho promeni ono koje je korisnica videla. Matrica ulaza:
 * `docs/PANTA-THEME9-FINAL-CTA.md` §4.2.
 */
import { useCallback, useMemo, useState } from "react";
import type { ThemeBookingPreview } from "@/types";

export type BookingStage =
  | "offering"
  | "slots"
  | "intake"
  | "review"
  | "done";

export interface BookingFlowState {
  stage: BookingStage;
  offeringId?: string;
  dateId?: string;
  time?: string;
  answers: Record<string, string>;
  freeText: string;
  intakeSkipped: boolean;
}

export interface UseBookingFlowOptions {
  data: ThemeBookingPreview;
  /** Ulogovana klijentkinja → kratak check-in umesto pune ankete. */
  returningClient?: boolean;
  onSubmit: (payload: BookingSubmitPayload) => Promise<void>;
}

export interface BookingSubmitPayload {
  offeringId?: string;
  offeringTitle?: string;
  priceLabel?: string;
  dateLong?: string;
  time?: string;
  returningClient: boolean;
  intakeSkipped: boolean;
  answers: { question: string; answer: string }[];
  freeText: string;
}

const EMPTY: BookingFlowState = {
  stage: "offering",
  answers: {},
  freeText: "",
  intakeSkipped: false,
};

export function useBookingFlow({
  data,
  returningClient = false,
  onSubmit,
}: UseBookingFlowOptions) {
  const [state, setState] = useState<BookingFlowState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questions = returningClient ? data.checkin : data.intake;
  const freeTextLabel = returningClient
    ? data.checkinFreeText
    : data.intakeFreeText;

  const offering = useMemo(
    () => data.offerings.find((o) => o.id === state.offeringId),
    [data.offerings, state.offeringId],
  );
  const date = useMemo(
    () => data.dates.find((d) => d.id === state.dateId),
    [data.dates, state.dateId],
  );

  const slotChosen = Boolean(state.dateId && state.time);
  const answeredCount = Object.keys(state.answers).length;

  /** Izbor datuma poništava vreme — drugi dan nema ista slobodna vremena. */
  const pickDate = useCallback((dateId: string) => {
    setState((prev) => ({ ...prev, dateId, time: undefined }));
  }, []);

  const pickTime = useCallback((time: string) => {
    setState((prev) => ({ ...prev, time }));
  }, []);

  /**
   * Izbor ponude poništava termin. Prelazak sa 45-minutne konsultacije na
   * 60-minutni paket znači da ranije izabrani slot više nije nužno validan —
   * tiho zadržan termin bi bio obećanje koje engine kasnije ne može da ispuni.
   */
  const pickOffering = useCallback((offeringId: string) => {
    setState((prev) =>
      prev.offeringId === offeringId
        ? prev
        : { ...prev, offeringId, dateId: undefined, time: undefined },
    );
  }, []);

  const answer = useCallback((questionId: string, value: string) => {
    setState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: value },
    }));
  }, []);

  const setFreeText = useCallback((freeText: string) => {
    setState((prev) => ({ ...prev, freeText }));
  }, []);

  const go = useCallback((stage: BookingStage) => {
    setState((prev) => ({ ...prev, stage }));
  }, []);

  /** Korak 01 → 02: ponuda je izabrana, termini se traže za nju. */
  const confirmOffering = useCallback(() => {
    setState((prev) => (prev.offeringId ? { ...prev, stage: "slots" } : prev));
  }, []);

  /** Korak 02 → 03: termin je izabran. */
  const confirmSlot = useCallback(() => {
    setState((prev) =>
      prev.dateId && prev.time
        ? { ...prev, intakeSkipped: false, stage: "intake" }
        : prev,
    );
  }, []);

  const skipIntake = useCallback(() => {
    setState((prev) => ({ ...prev, intakeSkipped: true, stage: "review" }));
  }, []);

  const toIntake = useCallback(() => {
    setState((prev) => ({ ...prev, intakeSkipped: false, stage: "intake" }));
  }, []);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        offeringId: offering?.id,
        offeringTitle: offering?.title,
        priceLabel: offering?.priceLabel,
        dateLong: date?.long,
        time: state.time,
        returningClient,
        intakeSkipped: state.intakeSkipped,
        answers: questions
          .filter((q) => state.answers[q.id])
          .map((q) => ({ question: q.label, answer: state.answers[q.id] })),
        freeText: state.freeText,
      });
      setState((prev) => ({ ...prev, stage: "done" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Slanje nije uspelo.");
    } finally {
      setSubmitting(false);
    }
  }, [date, offering, onSubmit, questions, returningClient, state]);

  const reset = useCallback(() => {
    setState(EMPTY);
    setError(null);
  }, []);

  return {
    state,
    offering,
    date,
    questions,
    freeTextLabel,
    slotChosen,
    answeredCount,
    submitting,
    error,
    pickDate,
    pickTime,
    pickOffering,
    answer,
    setFreeText,
    go,
    confirmOffering,
    confirmSlot,
    skipIntake,
    toIntake,
    submit,
    reset,
  };
}
