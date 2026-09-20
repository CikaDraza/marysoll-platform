"use client";
/**
 * Theme10BookingProvider — booking modal teme theme-10 (dizajn „Ash Studio").
 *
 * Tok bez unapred izabrane radnice: 01 Termin → 02 Usluga → 03 Majstor →
 * 04 Potvrda. Kada se stigne iz Tim sekcije, majstor je već poznat pa je tok
 * kraći: 01 Termin → 02 Usluga → 03 Potvrda. Prikaz je teme, a pravila nisu:
 *   - slobodni termini idu kroz `widgetDay` (isti `@panta/booking-engine` koji
 *     koriste javni widget, `/api/slots` i admin kalendar);
 *   - „Potvrdi termin" predaje izbor deljenom `BookingModal`-u, koji radi
 *     prijavu/gosta, dodatke, vaučer, proveru trajanja i sam upis.
 *
 * Privremena Ash Studio demo matrica bira majstora za osam usluga iz handoffa.
 * Kad se stigne iz Tim sekcije (`openForMaster`), taj izbor je unapred poznat
 * i filtrira usluge. Termini se ne filtriraju po zaposlenom, jer taj podatak
 * još nije deo stvarnog booking domena. Vidi `booking/context.ts`.
 *
 * Gost koji mora da se prijavi čuva izbor u `sessionStorage` (isti ugovor kao
 * widget); po povratku na početnu, provider sam otvara formu za potvrdu.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { detectCustomDomain } from "@/hooks/useClientRouting";
import {
  BookingModal,
  PENDING_STORAGE_KEY,
  type PendingAppointment,
} from "@/components/shared/BookingModal";
import type {
  IService,
  ManualSlotsMap,
  SalonProfileData,
  WorkingHoursMap,
} from "@/types";
import { firstAvailableDate, widgetDay } from "@/lib/booking/widgetDay";
import { Theme10BookingContext, type Theme10Master } from "./context";
import {
  theme10BookableServices,
  theme10DemoPriceForMaster,
  theme10MastersForService,
  theme10ServicesForMaster,
} from "../demoCatalog";
import {
  DOW_SHORT,
  formatDayHeading,
  formatDayLong,
  formatDayMonth,
  freeSlotsLabel,
  fromDateKey,
  mondayOf,
  serviceDurationLabel,
  servicePriceLabel,
  toDateKey,
} from "../format";

type PublicAppt = {
  _id: string;
  date: string;
  time: string;
  duration: number;
  serviceName: string;
  status: string;
};

type Step = 1 | 2 | 3 | 4;

interface Props {
  tenantSlug?: string;
  clientSlug?: string;
  salon: SalonProfileData;
  services: IService[];
  children: ReactNode;
}

const OPEN_STEPS: { n: string; label: string; step: Step }[] = [
  { n: "01", label: "Termin", step: 1 },
  { n: "02", label: "Usluga", step: 2 },
  { n: "03", label: "Majstor", step: 3 },
  { n: "04", label: "Potvrda", step: 4 },
];

const LOCKED_STEPS: { n: string; label: string; step: Step }[] = [
  { n: "01", label: "Termin", step: 1 },
  { n: "02", label: "Usluga", step: 2 },
  { n: "03", label: "Potvrda", step: 4 },
];

const BACK_LINK =
  "self-start border-b border-ash-ink/25 py-3 text-[11px] uppercase tracking-[0.2em] text-ash-ink-soft transition-colors duration-200 ease-out hover:border-ash-gold hover:text-ash-gold-dk focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-ash-gold";

const SOLID_PILL =
  "inline-flex items-center gap-3.5 rounded-full bg-ash-ink px-8 py-[18px] text-[12px] uppercase tracking-[0.2em] text-ash-paper-2 transition-colors duration-200 ease-out hover:bg-ash-gold hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-ash-gold";

export function Theme10BookingProvider({
  tenantSlug,
  clientSlug,
  salon,
  services,
  children,
}: Props) {
  const { user, token } = useAuth();
  const isLoggedIn = !!user;
  const effectiveSlug = clientSlug ?? tenantSlug;

  const [isOpen, setIsOpen] = useState(false);
  /** `null` znači početni prikaz: automatski prvi dan sa slobodnim terminom. */
  const [weekOffset, setWeekOffset] = useState<number | null>(null);
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [done, setDone] = useState(false);
  /** Majstor iz Tim sekcije — demo filter usluga + napomena termina. */
  const [lockedMaster, setLockedMaster] = useState<Theme10Master | null>(null);
  /** Izabrani majstor iz trećeg koraka kada booking nije zaključan. */
  const [selectedMaster, setSelectedMaster] = useState<Theme10Master | null>(null);
  /** Deljena forma je otvorena — tematski modal se tada sklanja. */
  const [handoff, setHandoff] = useState(false);
  const [pendingDefaults, setPendingDefaults] = useState<Omit<
    PendingAppointment,
    "tenantSlug"
  > | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const invokerRef = useRef<HTMLElement | null>(null);

  const reset = useCallback(() => {
    setWeekOffset(null);
    setDayKey(null);
    setSlot(null);
    setServiceId(null);
    setStep(1);
    setDone(false);
    setLockedMaster(null);
    setSelectedMaster(null);
  }, []);

  const open = useCallback(() => {
    invokerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    reset();
    setIsOpen(true);
  }, [reset]);

  const openForMaster = useCallback(
    (master: Theme10Master) => {
      invokerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      reset();
      setLockedMaster(master);
      setSelectedMaster(master);
      setIsOpen(true);
    },
    [reset],
  );

  const close = useCallback(() => {
    setIsOpen(false);
    reset();
    invokerRef.current?.focus();
  }, [reset]);

  // ── Javni termini — isti izvor i ključ kao javni widget ─────────────────
  const { data: appointments = [] } = useQuery<PublicAppt[]>({
    queryKey: ["pub-appts-widget", effectiveSlug],
    queryFn: async () => {
      if (!effectiveSlug) return [];
      const res = await fetch(`/api/public/${effectiveSlug}/appointments`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!effectiveSlug && (isOpen || handoff),
    refetchInterval: isOpen ? 30_000 : false,
    staleTime: 0,
  });

  const workingHours = salon.workingHours as WorkingHoursMap | undefined;
  const isManual = salon.availabilityMode === "manualSlots";
  const manualSlots = salon.manualSlots as ManualSlotsMap | undefined;
  const vacations = salon.vacations;

  const today = useMemo(() => new Date(), []);
  const firstFreeDayKey = useMemo(
    () =>
      firstAvailableDate(
        {
          workingHours,
          manualSlots,
          isManual,
          appointments,
          vacations,
          now: today,
        },
        toDateKey(today),
      ),
    [workingHours, manualSlots, isManual, appointments, vacations, today],
  );

  const firstFreeWeekOffset = useMemo(() => {
    if (!firstFreeDayKey) return 0;
    const firstMonday = mondayOf(fromDateKey(firstFreeDayKey));
    const currentMonday = mondayOf(today);
    return Math.max(0, Math.round((firstMonday.getTime() - currentMonday.getTime()) / 604_800_000));
  }, [firstFreeDayKey, today]);

  const visibleWeekOffset = weekOffset ?? firstFreeWeekOffset;

  const weekStart = useMemo(() => {
    const monday = mondayOf(today);
    monday.setDate(monday.getDate() + visibleWeekOffset * 7);
    return monday;
  }, [today, visibleWeekOffset]);

  const days = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const key = toDateKey(date);
      const day = widgetDay(key, {
        workingHours,
        manualSlots,
        isManual,
        appointments,
        vacations,
        now,
      });
      const free = day.slots.filter((s) => !s.taken && !s.past).map((s) => s.time);
      const isPast = key < toDateKey(now);
      const status = free.length
        ? freeSlotsLabel(free.length)
        : isPast
          ? "Prošlo"
          : !day.isWorking
            ? "Ne radi"
            : "Popunjeno";
      return { key, date, dow: DOW_SHORT[i], free, status };
    });
  }, [weekStart, workingHours, manualSlots, isManual, appointments, vacations]);

  const selectedDayKey = dayKey ?? (weekOffset === null ? firstFreeDayKey : null);
  const currentDay = days.find((d) => d.key === selectedDayKey) ?? null;
  const pickedDate = selectedDayKey ? fromDateKey(selectedDayKey) : null;
  const availableServices = useMemo(
    () =>
      lockedMaster
        ? theme10ServicesForMaster(services, lockedMaster.name)
        : theme10BookableServices(services),
    [services, lockedMaster],
  );
  const service = availableServices.find((s) => s._id === serviceId) ?? null;
  const eligibleMasters = useMemo(
    () => (service ? theme10MastersForService(service) : []),
    [service],
  );
  const bookingSteps = lockedMaster ? LOCKED_STEPS : OPEN_STEPS;
  const selectedPrice = service && selectedMaster
    ? theme10DemoPriceForMaster(service, selectedMaster.name.toLocaleLowerCase("sr-RS"))
    : null;

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekLabel = `${formatDayMonth(weekStart)} — ${formatDayMonth(weekEnd)} ${weekEnd.getFullYear()}.`;

  // ── Esc, zaključan skrol i fokus zamka dok je modal otvoren ─────────────
  const dialogVisible = isOpen && !handoff;

  useEffect(() => {
    if (!dialogVisible) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
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
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [dialogVisible, close]);

  // ── Povratak gosta posle prijave: nastavi potvrdu sačuvanog termina ─────
  useEffect(() => {
    if (!isLoggedIn) return;
    try {
      const raw = sessionStorage.getItem(PENDING_STORAGE_KEY);
      if (!raw) return;
      const pending = JSON.parse(raw) as PendingAppointment;
      if (pending.tenantSlug && effectiveSlug && pending.tenantSlug !== effectiveSlug)
        return;
      sessionStorage.removeItem(PENDING_STORAGE_KEY);
      if (new Date(`${pending.date}T${pending.time}`) < new Date()) return;
      const { tenantSlug: _ignored, ...defaults } = pending;
      void _ignored;
      // Isti obrazac kao HomepageAppointmentWidget: stanje se postavlja van
      // sinhronog tela efekta.
      async function restore() {
        setPendingDefaults(defaults);
        setDayKey(pending.date);
        setSlot(pending.time);
        setServiceId(pending.serviceId || null);
        setIsOpen(true);
        setStep(4);
        setHandoff(true);
      }
      void restore();
    } catch {
      /* oštećen zapis — ignoriši */
    }
  }, [isLoggedIn, effectiveSlug]);

  function handleGuestConfirm(
    data: Omit<PendingAppointment, "tenantSlug">,
    destination: "login" | "register" = "login",
  ) {
    const pending: PendingAppointment = { ...data, tenantSlug: effectiveSlug ?? "" };
    try {
      sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pending));
    } catch {
      /* ignore */
    }
    const base = detectCustomDomain() ? "" : clientSlug ? `/${clientSlug}` : "";
    window.location.href = `${base}/${destination}?pendingBooking=1`;
  }

  const ctx = useMemo(
    () => ({ open, openForMaster, available: true }),
    [open, openForMaster],
  );

  return (
    <Theme10BookingContext.Provider value={ctx}>
      {children}

      {dialogVisible &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-[rgba(20,19,18,0.55)] p-[clamp(12px,3vw,48px)] font-jost text-ash-ink backdrop-blur-[6px]"
            onClick={close}
          >
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="t10-booking-title"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[880px] border border-ash-ink/12 bg-ash-paper-2 shadow-[0_40px_90px_rgba(20,19,18,0.35)]"
            >
              {/* Zaglavlje */}
              <div className="flex items-start justify-between gap-5 border-b border-ash-ink/10 bg-[linear-gradient(120deg,#e9e7e4_0%,#d4d2ce_100%)] px-[clamp(20px,3vw,38px)] py-[clamp(22px,3vw,34px)]">
                <div>
                  <span className="text-[10.5px] uppercase tracking-[0.32em] text-ash-ink-faint">
                    Zakazivanje termina
                  </span>
                  <h3
                    id="t10-booking-title"
                    className="mt-2.5 font-cormorant text-[clamp(26px,3vw,40px)] font-normal leading-none"
                  >
                    Izaberite svoj termin
                  </h3>
                  {lockedMaster && (
                    <div className="mt-4 inline-flex flex-wrap items-baseline gap-x-3.5 gap-y-1 bg-ash-ink px-4 py-[9px]">
                      <span className="text-[11px] uppercase tracking-[0.26em] text-ash-gold-lt">
                        Majstor {lockedMaster.name.toUpperCase()}
                      </span>
                      {lockedMaster.spec && (
                        <span className="text-xs font-light text-[#b9b7b2]">
                          {lockedMaster.spec}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={close}
                  aria-label="Zatvori"
                  className="h-10 w-10 flex-none rounded-full border border-ash-ink/25 text-base leading-none transition-colors duration-200 ease-out hover:border-ash-ink hover:bg-ash-ink hover:text-ash-paper-2 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-ash-gold"
                >
                  ×
                </button>
              </div>

              {/* Koraci */}
              <ol className="flex flex-wrap gap-[clamp(14px,2.4vw,32px)] border-b border-ash-ink/10 bg-white px-[clamp(20px,3vw,38px)] py-4">
                {bookingSteps.map((s) => {
                  const reached = done || step >= s.step;
                  const current = !done && step === s.step;
                  return (
                    <li
                      key={s.n}
                      aria-current={current ? "step" : undefined}
                      className={`flex items-baseline gap-2 text-[10.5px] uppercase tracking-[0.22em] ${
                        current
                          ? "text-ash-ink"
                          : reached
                            ? "text-ash-gold-dk"
                            : "text-[#a5a39e]"
                      }`}
                    >
                      <span
                        className={`font-cormorant text-[19px] tracking-normal ${
                          reached ? "text-ash-gold" : "text-[#c6c4bf]"
                        }`}
                      >
                        {s.n}
                      </span>
                      {s.label}
                    </li>
                  );
                })}
              </ol>

              <div className="px-[clamp(20px,3vw,38px)] py-[clamp(20px,3vw,34px)]">
                {done ? (
                  <div className="flex flex-col items-start gap-[18px] py-[clamp(16px,3vw,40px)]">
                    <span className="h-px w-14 bg-ash-gold" />
                    <h4 className="font-cormorant text-[clamp(26px,3vw,42px)] font-normal leading-[1.05]">
                      Termin je zakazan.
                    </h4>
                    <p className="max-w-[44ch] text-[15.5px] font-light leading-[1.75] text-ash-ink-soft">
                      {pickedDate ? formatDayLong(pickedDate) : ""} u {slot} —{" "}
                      {service?.name}
                      {selectedMaster ? ` — Majstor: ${selectedMaster.name}` : ""}.
                      Vidimo se u studiju.
                    </p>
                    <button
                      type="button"
                      onClick={close}
                      className="inline-flex items-center gap-3 rounded-full border border-ash-ink px-[30px] py-4 text-[11.5px] uppercase tracking-[0.2em] transition-colors duration-200 ease-out hover:bg-ash-ink hover:text-ash-paper-2 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-ash-gold"
                    >
                      Zatvori
                    </button>
                  </div>
                ) : step === 1 ? (
                  <div className="flex flex-col gap-[22px]">
                    <div className="flex items-center justify-center gap-[clamp(16px,3vw,36px)]">
                      <WeekArrow
                        label="Prethodna sedmica"
                        disabled={visibleWeekOffset === 0}
                        onClick={() => {
                          setWeekOffset((current) =>
                            Math.max(0, (current ?? firstFreeWeekOffset) - 1),
                          );
                          setDayKey(null);
                          setSlot(null);
                        }}
                      >
                        ←
                      </WeekArrow>
                      <span
                        aria-live="polite"
                        className="font-cormorant text-[clamp(20px,2.2vw,28px)] tracking-[0.02em]"
                      >
                        {weekLabel}
                      </span>
                      <WeekArrow
                        label="Sledeća sedmica"
                        onClick={() => {
                          setWeekOffset((current) => (current ?? firstFreeWeekOffset) + 1);
                          setDayKey(null);
                          setSlot(null);
                        }}
                      >
                        →
                      </WeekArrow>
                    </div>

                    <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2">
                      {days.map((d) => {
                        const isFree = d.free.length > 0;
                        const selected = d.key === selectedDayKey;
                        return (
                          <button
                            key={d.key}
                            type="button"
                            disabled={!isFree}
                            aria-pressed={selected}
                            onClick={() => {
                              setDayKey(d.key);
                              setSlot(null);
                            }}
                            className={`flex flex-col items-center border px-2.5 py-3.5 text-center focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-ash-gold ${
                              selected
                                ? "border-ash-gold bg-[#fbfaf8]"
                                : "border-ash-ink/12 bg-transparent"
                            } ${isFree ? "cursor-pointer" : "cursor-not-allowed opacity-55"}`}
                          >
                            <span
                              className={`text-[10px] tracking-[0.2em] ${
                                selected ? "text-ash-gold-dk" : "text-[#8b8983]"
                              }`}
                            >
                              {d.dow}
                            </span>
                            <span
                              className={`mt-1.5 font-cormorant text-[28px] leading-none ${
                                isFree ? "text-ash-ink" : "text-[#a5a39e]"
                              }`}
                            >
                              {d.date.getDate()}
                            </span>
                            <span
                              className={`mt-2 whitespace-nowrap rounded-[5px] px-[7px] py-1 text-[9.5px] uppercase tracking-[0.1em] ${
                                isFree
                                  ? "bg-ash-ink text-ash-gold-lt"
                                  : "bg-[#e3e1de] text-[#8b8983]"
                              }`}
                            >
                              {d.status}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {currentDay && pickedDate ? (
                      <div className="flex flex-col gap-3.5 border-t border-ash-ink/12 pt-1.5">
                        <span className="pt-3.5 text-[11px] uppercase tracking-[0.28em] text-ash-ink-faint">
                          Slobodno — {formatDayHeading(pickedDate)}
                        </span>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2">
                          {currentDay.free.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                // Automatski izabrani dan nema još eksplicitno stanje;
                                // sačuvaj ga tek kad korisnica potvrdi konkretan termin.
                                setDayKey(currentDay.key);
                                setSlot(t);
                                setServiceId(null);
                                setStep(2);
                              }}
                              className={`border px-2 py-[13px] text-[13px] tracking-[0.06em] transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-ash-gold ${
                                slot === t
                                  ? "border-ash-ink bg-ash-ink text-ash-paper-2"
                                  : "border-ash-ink/14 bg-white text-ash-ink hover:border-ash-gold"
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1.5 text-sm font-light leading-[1.7] text-ash-ink-faint">
                        Izaberite dan da vidite slobodne termine. Popunjeni dani su
                        označeni sivo.
                      </p>
                    )}
                  </div>
                ) : step === 2 ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2.5">
                      <span className="text-[11px] uppercase tracking-[0.28em] text-ash-ink-faint">
                        Izaberite uslugu
                      </span>
                      <span className="text-[13px] font-light text-ash-ink-soft">
                        {pickedDate ? formatDayHeading(pickedDate) : ""} · {slot}
                      </span>
                    </div>
                    {availableServices.length === 0 ? (
                      <p className="text-sm font-light text-ash-ink-faint">
                        Za ovog majstora trenutno nema objavljenih usluga za online zakazivanje.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {availableServices.map((s) => {
                          const meta = [serviceDurationLabel(s), servicePriceLabel(s)]
                            .filter(Boolean)
                            .join("  ·  ");
                          const selected = s._id === serviceId;
                          return (
                            <button
                              key={s._id}
                              type="button"
                              onClick={() => {
                                setServiceId(s._id);
                                setSelectedMaster(lockedMaster);
                                setStep(lockedMaster ? 4 : 3);
                              }}
                              className={`flex w-full flex-wrap items-baseline justify-between gap-2.5 border px-[18px] py-4 text-left transition-colors duration-200 ease-out hover:border-ash-gold focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-ash-gold ${
                                selected
                                  ? "border-ash-gold bg-[#fbfaf8]"
                                  : "border-ash-ink/12 bg-white"
                              }`}
                            >
                              <span className="flex flex-col gap-[5px]">
                                <span className="font-cormorant text-[21px] leading-[1.1] text-ash-ink">
                                  {s.name}
                                </span>
                                {s.category && (
                                  <span className="text-[11.5px] uppercase tracking-[0.14em] text-ash-gold-dk">
                                    {s.category}
                                  </span>
                                )}
                              </span>
                              {meta && (
                                <span className="whitespace-nowrap text-[13px] font-light text-ash-ink-mute">
                                  {meta}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <button type="button" onClick={() => setStep(1)} className={BACK_LINK}>
                      ← Nazad na termin
                    </button>
                  </div>
                ) : step === 3 ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2.5">
                      <span className="text-[11px] uppercase tracking-[0.28em] text-ash-ink-faint">
                        Izaberite majstora
                      </span>
                      <span className="text-[13px] font-light text-ash-ink-soft">
                        {service?.name ?? ""}
                      </span>
                    </div>
                    {eligibleMasters.length === 0 ? (
                      <p className="text-sm font-light text-ash-ink-faint">
                        Za ovu uslugu trenutno nema dostupnog majstora.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {eligibleMasters.map((master) => {
                          const selected = selectedMaster?.name === master.label;
                          const price = service
                            ? theme10DemoPriceForMaster(service, master.id)
                            : null;
                          return (
                            <button
                              key={master.id}
                              type="button"
                              onClick={() => {
                                setSelectedMaster({ name: master.label, spec: master.spec });
                                setStep(4);
                              }}
                              className={`flex w-full flex-wrap items-baseline justify-between gap-2.5 border px-[18px] py-4 text-left transition-colors duration-200 ease-out hover:border-ash-gold focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-ash-gold ${
                                selected
                                  ? "border-ash-gold bg-[#fbfaf8]"
                                  : "border-ash-ink/12 bg-white"
                              }`}
                            >
                              <span className="flex flex-col gap-[5px]">
                                <span className="font-cormorant text-[21px] leading-[1.1] text-ash-ink">
                                  {master.label}
                                </span>
                                <span className="text-[11.5px] uppercase tracking-[0.14em] text-ash-gold-dk">
                                  {master.spec}
                                </span>
                              </span>
                              {price && (
                                <span className="whitespace-nowrap text-[13px] font-light text-ash-ink-mute">
                                  {price}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <button type="button" onClick={() => setStep(2)} className={BACK_LINK}>
                      ← Promeni uslugu
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-[22px]">
                    <span className="text-[11px] uppercase tracking-[0.28em] text-ash-ink-faint">
                      Potvrda
                    </span>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-px border border-ash-ink/12 bg-ash-ink/12">
                      <div className="bg-white p-[22px]">
                        <div className="mb-2.5 text-[10.5px] uppercase tracking-[0.26em] text-[#8b8983]">
                          Termin
                        </div>
                        <div className="font-cormorant text-2xl leading-[1.2]">{slot}</div>
                        <div className="mt-1.5 text-[13px] font-light text-ash-ink-mute">
                          {pickedDate ? formatDayLong(pickedDate) : "—"}
                        </div>
                      </div>
                      <div className="bg-white p-[22px]">
                        <div className="mb-2.5 text-[10.5px] uppercase tracking-[0.26em] text-[#8b8983]">
                          Usluga
                        </div>
                        <div className="font-cormorant text-2xl leading-[1.2]">
                          {service?.name ?? "—"}
                        </div>
                        <div className="mt-1.5 text-[13px] font-light text-ash-ink-mute">
                          {service
                            ? [serviceDurationLabel(service), selectedPrice ?? servicePriceLabel(service)]
                                .filter(Boolean)
                                .join("  ·  ")
                            : ""}
                        </div>
                      </div>
                      <div className="bg-white p-[22px]">
                        <div className="mb-2.5 text-[10.5px] uppercase tracking-[0.26em] text-[#8b8983]">
                          Majstor
                        </div>
                        <div className="font-cormorant text-2xl leading-[1.2]">
                          {selectedMaster?.name ?? "—"}
                        </div>
                        {selectedMaster?.spec && (
                          <div className="mt-1.5 text-[13px] font-light text-ash-ink-mute">
                            {selectedMaster.spec}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3.5">
                      <button
                        type="button"
                        onClick={() => setHandoff(true)}
                        disabled={!service || !slot || !dayKey || !selectedMaster}
                        className={SOLID_PILL}
                      >
                        Potvrdi termin <span aria-hidden>→</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep(lockedMaster ? 2 : 3)}
                        className={BACK_LINK}
                      >
                        ← {lockedMaster ? "Promeni uslugu" : "Promeni majstora"}
                      </button>
                    </div>
                    <p className="text-[13px] font-light leading-[1.7] text-ash-ink-faint">
                      U sledećem koraku unosite kontakt podatke i potvrđujete termin.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {isOpen && handoff && dayKey && slot && (
        <BookingModal
          key={`${dayKey}-${slot}-${serviceId ?? ""}-${selectedMaster?.name ?? ""}`}
          isOpen
          onClose={() => {
            setHandoff(false);
            setPendingDefaults(null);
            // Posle vraćenog izbora (povratak gosta) nema tematskog koraka na
            // koji bi se vratilo — zatvori sve.
            if (pendingDefaults) close();
          }}
          onBooked={() => {
            setDone(true);
            setHandoff(false);
            setPendingDefaults(null);
          }}
          defaultDate={dayKey}
          defaultTime={slot}
          defaultServiceId={serviceId ?? undefined}
          defaultNote={selectedMaster ? `Željeni majstor: ${selectedMaster.name}` : undefined}
          services={availableServices}
          isLoggedIn={isLoggedIn}
          userName={user?.name}
          userEmail={user?.email}
          token={token ?? undefined}
          tenantSlug={effectiveSlug}
          onConfirmedByGuest={handleGuestConfirm}
          pendingDefaults={pendingDefaults}
          availabilityMode={salon.availabilityMode}
          workingHours={workingHours}
          manualSlots={manualSlots}
          bookedAppointments={appointments}
        />
      )}
    </Theme10BookingContext.Provider>
  );
}

function WeekArrow({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="h-[38px] w-[38px] rounded-full border border-ash-ink/20 text-sm transition-colors duration-200 ease-out hover:border-ash-gold hover:text-ash-gold-dk disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-ash-ink/20 disabled:hover:text-ash-ink focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-ash-gold"
    >
      {children}
    </button>
  );
}
