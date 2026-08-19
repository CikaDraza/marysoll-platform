"use client";
/**
 * Theme9BookingDialog — prikaz toka zakazivanja.
 *
 * DVE POVRŠINE, jedan dijalog: prvo widget sa terminima, pa koraci. Kad se
 * izabere termin, korak 01 ga zatiče POPUNJENOG i može da se promeni.
 *
 * NIŠTA SE NE UPISUJE. Ekran potvrde to izričito kaže — modal koji tvrdi da je
 * termin zakazan, a ne upisuje ga, opasan je čim izađe iz staging-a.
 *
 * Fokus trap, scroll lock i `Esc` postoje; klik na pozadinu NE zatvara.
 */
import { useCallback, useEffect, useRef } from "react";
import type { ThemeBookingPreview } from "@/types";
import {
  useBookingFlow,
  type BookingSubmitPayload,
} from "@/hooks/booking/useBookingFlow";

interface Props {
  data: ThemeBookingPreview;
  returningClient: boolean;
  tenantSlug?: string;
  onClose: () => void;
}

const STEP_LABEL: Record<string, string> = {
  service: "01 — Izbor i termin",
  intake: "02 — Kratak upitnik",
  review: "03 — Pregled",
};

export function Theme9BookingDialog({
  data,
  returningClient,
  tenantSlug,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  const submit = useCallback(
    async (payload: BookingSubmitPayload) => {
      const res = await fetch(`/api/public/${tenantSlug ?? ""}/booking-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Slanje nije uspelo.");
      }
    },
    [tenantSlug],
  );

  const flow = useBookingFlow({ data, returningClient, onSubmit: submit });
  const { state } = flow;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = panelRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const pill = (selected: boolean) =>
    `flex flex-col items-center gap-[3px] rounded-[14px] border px-1.5 py-3 text-[14px] transition-colors ${
      selected
        ? "border-ee-accent bg-ee-accent text-white"
        : "border-ee-border bg-ee-surface text-ee-text hover:border-ee-accent/40"
    }`;

  const headerTitle =
    state.stage === "slots"
      ? "Izaberi termin"
      : state.stage === "done"
        ? "Proba je poslata"
        : STEP_LABEL[state.stage];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Zakazivanje konsultacije"
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-[color-mix(in_oklab,#3a2e28_42%,transparent)] px-4 py-[clamp(16px,4vh,56px)] backdrop-blur-[6px]"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="bg-ee-canvas flex w-full max-w-[620px] flex-col overflow-hidden rounded-[24px] shadow-[0_14px_34px_rgba(58,46,40,0.1)] outline-none"
      >
        <header className="border-ee-border flex items-start justify-between gap-4 border-b px-5 py-5 md:px-8">
          <div className="flex flex-col gap-1">
            <span className="text-ee-sage text-[10.5px] tracking-[0.16em] uppercase">
              Zakazivanje
            </span>
            <span className="font-newsreader text-ee-accent text-[20px]">
              {headerTitle}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zatvori"
            className="border-ee-border bg-ee-surface hover:bg-ee-surface-muted flex h-9 w-9 flex-none items-center justify-center rounded-full border text-[18px] leading-none"
          >
            ×
          </button>
        </header>

        <div className="flex flex-col gap-6 px-5 py-6 md:px-8">
          {state.stage === "slots" && (
            <>
              <div className="flex flex-col gap-2.5">
                <span className="text-ee-text-muted text-[11px] tracking-[0.14em] uppercase">
                  Datum{data.month ? ` · ${data.month}` : ""}
                </span>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,90px),1fr))] gap-2">
                  {data.dates.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => flow.pickDate(d.id)}
                      className={pill(state.dateId === d.id)}
                    >
                      <span className="text-[11px] tracking-[0.08em] uppercase opacity-75">
                        {d.dow}
                      </span>
                      <span className="font-newsreader text-[19px] leading-none">
                        {d.day}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <span className="text-ee-text-muted text-[11px] tracking-[0.14em] uppercase">
                  Vreme
                </span>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,90px),1fr))] gap-2">
                  {data.times.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => flow.pickTime(t)}
                      disabled={!state.dateId}
                      className={`${pill(state.time === t)} disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      <span className="text-[14.5px]">{t}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Footer
                note={
                  flow.slotChosen
                    ? "Termin možeš da promeniš i u sledećem koraku."
                    : "Izaberi datum i vreme"
                }
                nextLabel="Nastavi"
                nextDisabled={!flow.slotChosen}
                onNext={flow.confirmSlot}
              />
            </>
          )}

          {state.stage === "service" && (
            <>
              <SlotSummary
                dateLabel={flow.date?.long}
                time={state.time}
                onChange={() => flow.go("slots")}
              />

              <div className="flex flex-col gap-2.5">
                <span className="text-ee-text-muted text-[11px] tracking-[0.14em] uppercase">
                  Izaberi uslugu
                </span>
                <div className="flex flex-col gap-3">
                  {data.services.map((s) => {
                    const selected = state.serviceId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => flow.pickService(s.id)}
                        className={`flex flex-col gap-3 rounded-[18px] border p-5 text-left transition-colors ${
                          selected
                            ? "border-ee-accent bg-[color-mix(in_oklab,#c6d5a8_20%,#ffffff)]"
                            : "border-ee-border bg-ee-surface hover:border-ee-accent/40"
                        }`}
                      >
                        <span className="flex items-start justify-between gap-4">
                          <span className="flex flex-col">
                            <span className="font-newsreader text-ee-accent text-[21px]">
                              {s.title}
                            </span>
                            {s.duration && (
                              <span className="text-ee-text-muted text-[12.5px]">
                                {s.duration}
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-3">
                            {s.priceLabel && (
                              <span className="font-newsreader text-ee-accent text-[18px] whitespace-nowrap">
                                {s.priceLabel}
                              </span>
                            )}
                            <span
                              aria-hidden
                              className={`h-[18px] w-[18px] flex-none rounded-full ${
                                selected
                                  ? "border-ee-accent border-[5px]"
                                  : "border-ee-border border-[1.5px]"
                              }`}
                            />
                          </span>
                        </span>
                        {s.includes && s.includes.length > 0 && (
                          <span className="border-ee-border flex flex-col gap-1.5 border-t pt-3">
                            {s.includes.map((inc) => (
                              <span
                                key={inc}
                                className="text-ee-text-muted flex gap-2 text-[13.5px]"
                              >
                                <span className="text-ee-terracotta" aria-hidden>
                                  —
                                </span>
                                {inc}
                              </span>
                            ))}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Footer
                note={
                  flow.service?.priceLabel
                    ? `Cena: ${flow.service.priceLabel}`
                    : "Izaberi uslugu"
                }
                backLabel="← Nazad"
                onBack={() => flow.go("slots")}
                nextLabel="Nastavi"
                nextDisabled={!state.serviceId}
                onNext={flow.toIntake}
              />
            </>
          )}

          {state.stage === "intake" && (
            <>
              <p className="font-newsreader text-ee-accent max-w-[34ch] text-[23px]">
                {returningClient
                  ? "Kako je bilo od poslednjeg razgovora?"
                  : "Nekoliko pitanja pre termina."}
              </p>

              {flow.questions.map((q, i) => (
                <div
                  key={q.id}
                  className="border-ee-border flex flex-col gap-3 border-b pb-5"
                >
                  <span className="flex items-baseline gap-2.5">
                    <span className="font-newsreader text-ee-sage text-[15px]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-ee-text text-[14.5px] font-semibold">
                      {q.label}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-2">
                    {q.options.map((o) => (
                      <button
                        key={o}
                        type="button"
                        onClick={() => flow.answer(q.id, o)}
                        className={`rounded-full border px-4 py-2 text-[13.5px] transition-colors ${
                          state.answers[q.id] === o
                            ? "border-ee-accent bg-ee-accent text-white"
                            : "border-ee-border bg-ee-surface text-ee-text hover:border-ee-accent/40"
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </span>
                </div>
              ))}

              {flow.freeTextLabel && (
                <label className="flex flex-col gap-2">
                  <span className="text-ee-text text-[14px]">
                    {flow.freeTextLabel}
                  </span>
                  <textarea
                    rows={3}
                    value={state.freeText}
                    onChange={(e) => flow.setFreeText(e.target.value)}
                    placeholder="Slobodan tekst — par rečenica je dovoljno."
                    className="border-ee-border bg-ee-surface text-ee-text resize-y rounded-[14px] border px-4 py-3 text-[14.5px] leading-[1.6]"
                  />
                </label>
              )}

              <Footer
                note={`${flow.answeredCount} / ${flow.questions.length} odgovoreno`}
                backLabel="← Nazad"
                onBack={() => flow.go("service")}
                skipLabel={
                  data.allowIntakeSkip !== false ? "Preskoči za sada" : undefined
                }
                onSkip={flow.skipIntake}
                nextLabel="Nastavi"
                onNext={() => flow.go("review")}
              />
            </>
          )}

          {state.stage === "review" && (
            <>
              <p className="font-newsreader text-ee-accent text-[23px]">
                Proveri i pošalji.
              </p>

              <div className="border-ee-border bg-ee-surface flex flex-col rounded-[18px] border p-5">
                <Row
                  label={flow.service?.title ?? "Usluga"}
                  value={flow.service?.duration}
                  serif
                />
                <Row
                  label="Termin"
                  value={
                    [flow.date?.long, state.time].filter(Boolean).join(" · ") ||
                    "Nije izabran"
                  }
                />
                <Row label="Cena" value={flow.service?.priceLabel} serif />
                <Row
                  label={returningClient ? "Check-in" : "Upitnik"}
                  value={
                    state.intakeSkipped
                      ? "○ preskočen"
                      : `✓ ${flow.answeredCount} odgovora`
                  }
                  last
                />
              </div>

              {data.confirmNote && (
                <p className="text-ee-text-muted text-[12.5px] leading-[1.6]">
                  {data.confirmNote}
                </p>
              )}

              {flow.error && (
                <p className="text-[13.5px] text-red-600">{flow.error}</p>
              )}

              <Footer
                backLabel="← Nazad"
                onBack={flow.toIntake}
                nextLabel={flow.submitting ? "Šaljem…" : "Pošalji probu"}
                nextDisabled={flow.submitting}
                onNext={flow.submit}
              />
            </>
          )}

          {state.stage === "done" && (
            <div className="flex flex-col items-start gap-4 py-2">
              <span className="bg-ee-accent-contrast text-ee-accent flex h-[52px] w-[52px] items-center justify-center rounded-full text-[22px]">
                ✓
              </span>
              <p className="font-newsreader text-ee-accent max-w-[26ch] text-[27px]">
                Proba je poslata na email.
              </p>
              <p className="text-ee-text-muted max-w-[46ch] text-[15px] leading-[1.7]">
                <strong className="text-ee-text">Termin NIJE zakazan.</strong> Ovo
                je prikaz toka — izbor i odgovori su poslati na email da bi se
                sadržaj potvrdio pre nego što zakazivanje postane stvarno.
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-ee-accent text-ee-canvas hover:bg-ee-accent-lift rounded-full px-7 py-3.5 text-[15px] font-semibold transition-colors"
                >
                  Zatvori
                </button>
                <button
                  type="button"
                  onClick={flow.reset}
                  className="text-ee-accent text-[14.5px] underline underline-offset-[3px]"
                >
                  Probaj ponovo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SlotSummary({
  dateLabel,
  time,
  onChange,
}: {
  dateLabel?: string;
  time?: string;
  onChange: () => void;
}) {
  return (
    <div className="border-ee-border bg-ee-surface flex flex-wrap items-center justify-between gap-3 rounded-[14px] border px-4 py-3">
      <span className="text-ee-text text-[14.5px] font-semibold">
        {[dateLabel, time].filter(Boolean).join(" · ")}
      </span>
      <button
        type="button"
        onClick={onChange}
        className="text-ee-accent text-[13.5px] underline underline-offset-[3px]"
      >
        Promeni termin
      </button>
    </div>
  );
}

function Row({
  label,
  value,
  serif,
  last,
}: {
  label: string;
  value?: string;
  serif?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-2.5 ${last ? "" : "border-ee-border border-b"}`}
    >
      <span
        className={
          serif
            ? "font-newsreader text-ee-accent text-[19px]"
            : "text-ee-text-muted text-[13.5px]"
        }
      >
        {label}
      </span>
      {value && (
        <span className="text-ee-text text-[14.5px] font-semibold">{value}</span>
      )}
    </div>
  );
}

function Footer({
  note,
  backLabel,
  onBack,
  skipLabel,
  onSkip,
  nextLabel,
  nextDisabled,
  onNext,
}: {
  note?: string;
  backLabel?: string;
  onBack?: () => void;
  skipLabel?: string;
  onSkip?: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  onNext: () => void;
}) {
  return (
    <div className="border-ee-border flex flex-wrap items-center justify-between gap-4 border-t pt-5">
      <span className="flex items-center gap-4">
        {backLabel && onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-ee-text-muted text-[13.5px]"
          >
            {backLabel}
          </button>
        )}
        {note && <span className="text-ee-sage text-[12.5px]">{note}</span>}
      </span>
      <span className="flex items-center gap-4">
        {skipLabel && onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-ee-text-muted text-[13.5px] underline underline-offset-[3px]"
          >
            {skipLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="bg-ee-accent text-ee-canvas hover:bg-ee-accent-lift rounded-full px-7 py-[15px] text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          {nextLabel}
        </button>
      </span>
    </div>
  );
}
