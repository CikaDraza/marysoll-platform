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
 * povratak na anketu čuva odgovore, povratak na termin čuva uslugu.
 */
import { useCallback, useMemo, useState } from "react";
import type { ThemeBookingPreview } from "@/types";

export type BookingStage = "slots" | "service" | "intake" | "review" | "done";

export interface BookingFlowState {
  stage: BookingStage;
  serviceId?: string;
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
  serviceId?: string;
  serviceTitle?: string;
  priceLabel?: string;
  dateLong?: string;
  time?: string;
  returningClient: boolean;
  intakeSkipped: boolean;
  answers: { question: string; answer: string }[];
  freeText: string;
}

const EMPTY: BookingFlowState = {
  stage: "slots",
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

  const service = useMemo(
    () => data.services.find((s) => s.id === state.serviceId),
    [data.services, state.serviceId],
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

  const pickService = useCallback((serviceId: string) => {
    setState((prev) => ({ ...prev, serviceId }));
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

  /** Iz widget-a u modal: termin je izabran, korak 01 ga zatiče popunjenog. */
  const confirmSlot = useCallback(() => {
    setState((prev) => (prev.dateId && prev.time ? { ...prev, stage: "service" } : prev));
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
        serviceId: service?.id,
        serviceTitle: service?.title,
        priceLabel: service?.priceLabel,
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
  }, [date, onSubmit, questions, returningClient, service, state]);

  const reset = useCallback(() => {
    setState(EMPTY);
    setError(null);
  }, []);

  return {
    state,
    service,
    date,
    questions,
    freeTextLabel,
    slotChosen,
    answeredCount,
    submitting,
    error,
    pickDate,
    pickTime,
    pickService,
    answer,
    setFreeText,
    go,
    confirmSlot,
    skipIntake,
    toIntake,
    submit,
    reset,
  };
}
