/**
 * HomepageAppointmentWidget — Public-facing appointment calendar for the home page.
 *
 * Week + Day view only (no FullCalendar).
 * Shows working hours widget at top, no legend.
 * Time slot buttons:
 *   - Available  → violet hover, clickable → opens booking modal
 *   - Booked     → black bg, not clickable
 * Non-working days: red border + light-red bg (day button in week view)
 * Day strip has prev/next arrows in addition to scroll.
 *
 * Auth flow:
 *   - Logged-in user  → fills form → "Zakaži termin" → creates appointment via API
 *   - Guest user      → fills form → "Postavi za rezervaciju" → saves to sessionStorage
 *                       → redirects to login/register page
 *   - On mount: if user is logged in AND sessionStorage has pending appointment
 *                       → auto-opens modal with pre-filled data for final confirm
 */
"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  getDay,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
} from "date-fns";
import { sr } from "date-fns/locale";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAppointmentMutations } from "@/hooks/useAppointmentMutations";
import { formatPriceToString } from "@/helpers/formatPrice";
import { detectCustomDomain } from "@/hooks/useClientRouting";
import type {
  WorkingHoursMap,
  DayOfWeek,
  ITimeSlot,
  IService,
  IAppointment,
  SalonProfileData,
} from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES_SR: DayOfWeek[] = [
  "Nedelja",
  "Ponedeljak",
  "Utorak",
  "Sreda",
  "Četvrtak",
  "Petak",
  "Subota",
];

const PENDING_STORAGE_KEY = "ms_pending_appointment";

// ─── Types ────────────────────────────────────────────────────────────────────

type PublicAppt = {
  _id: string;
  date: string;
  time: string;
  duration: number;
  serviceName: string;
  status: string;
};

type PendingAppointment = {
  tenantSlug: string;
  date: string;
  time: string;
  serviceId: string;
  variantName: string;
  extras: string[];
  note: string;
  totalPrice: number;
  totalDuration: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function getWorkingRange(
  workingHours: WorkingHoursMap | undefined,
  date: Date,
): { isWorking: boolean; start: string; end: string } {
  if (!workingHours) return { isWorking: false, start: "", end: "" };
  const dayName = DAY_NAMES_SR[getDay(date)] as DayOfWeek;
  const slots = (workingHours[dayName] ?? []) as ITimeSlot[];
  if (!slots.length) return { isWorking: false, start: "", end: "" };
  const starts = slots.map((s) => s.from).sort();
  const ends = slots.map((s) => s.to).sort();
  return { isWorking: true, start: starts[0], end: ends[ends.length - 1] };
}

function generateSlots(start: string, end: string): string[] {
  const slots: string[] = [];
  let cur = toMins(start);
  const endM = toMins(end);
  while (cur < endM) {
    const h = Math.floor(cur / 60)
      .toString()
      .padStart(2, "0");
    const m = (cur % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    cur += 30;
  }
  return slots;
}

function isSlotBooked(
  appointments: PublicAppt[],
  dateStr: string,
  slot: string,
): boolean {
  const slotMin = toMins(slot);
  return appointments.some((a) => {
    if (a.date !== dateStr) return false;
    const startMin = toMins(a.time);
    const endMin = startMin + (a.duration || 60);
    return slotMin >= startMin && slotMin < endMin;
  });
}

function isDayFullyBooked(
  appointments: PublicAppt[],
  slots: string[],
  dateStr: string,
): boolean {
  if (!slots.length) return false;
  return slots.every((slot) => isSlotBooked(appointments, dateStr, slot));
}

// ─── BookingModal ─────────────────────────────────────────────────────────────

function BookingModal({
  isOpen,
  onClose,
  defaultDate,
  defaultTime,
  services,
  isLoggedIn,
  userName,
  userEmail,
  token,
  onConfirmedByGuest,
  pendingDefaults,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultDate: string;
  defaultTime: string;
  services: IService[];
  isLoggedIn: boolean;
  userName?: string;
  userEmail?: string;
  token?: string;
  onConfirmedByGuest: (data: Omit<PendingAppointment, "tenantSlug">) => void;
  pendingDefaults?: Omit<PendingAppointment, "tenantSlug"> | null;
}) {
  const { user } = useAuth();
  const { createAppointment } = useAppointmentMutations(token);

  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [selectedTime, setSelectedTime] = useState(defaultTime);
  const [selectedServiceId, setSelectedServiceId] = useState(
    pendingDefaults?.serviceId || services[0]?._id || "",
  );
  const [selectedVariant, setSelectedVariant] = useState(
    pendingDefaults?.variantName || "",
  );
  const [selectedExtras, setSelectedExtras] = useState<string[]>(
    pendingDefaults?.extras || [],
  );
  const [note, setNote] = useState(pendingDefaults?.note || "");

  // Sync when defaults change (pending appointment restore)
  useEffect(() => {
    async function handleChangeAppointments() {
      setSelectedDate(defaultDate);
      setSelectedTime(defaultTime);
      if (pendingDefaults) {
        setSelectedServiceId(
          pendingDefaults.serviceId || services[0]?._id || "",
        );
        setSelectedVariant(pendingDefaults.variantName || "");
        setSelectedExtras(pendingDefaults.extras || []);
        setNote(pendingDefaults.note || "");
      }
    }
    handleChangeAppointments();
  }, [defaultDate, defaultTime, pendingDefaults, services]);

  const selectedService = services.find((s) => s._id === selectedServiceId);

  const { price: totalPrice, duration: totalDuration } = useMemo(() => {
    if (!selectedService) return { price: 0, duration: 0 };
    let price = 0;
    let duration = selectedService.duration || 0;

    if (
      selectedService.type === "variant" &&
      selectedVariant &&
      selectedService.variants
    ) {
      const variant = selectedService.variants.find(
        (v) => v.name === selectedVariant,
      );
      if (variant) {
        price = variant.price;
        if (variant.duration) duration = variant.duration;
      }
    } else if (selectedService.type === "single") {
      price = selectedService.basePrice || 0;
      duration = selectedService.duration || 0;
    } else {
      price = selectedService.basePrice || 0;
      duration = selectedService.duration || 0;
    }

    if (selectedService.extras && selectedExtras.length > 0) {
      selectedExtras.forEach((extraName) => {
        const extra = selectedService.extras?.find((e) => e.name === extraName);
        if (extra) {
          price += extra.price || 0;
          if (extra.duration) duration += extra.duration;
        }
      });
    }

    return { price, duration };
  }, [selectedService, selectedVariant, selectedExtras]);

  function handleClose() {
    setSelectedServiceId(services[0]?._id || "");
    setSelectedVariant("");
    setSelectedExtras([]);
    setNote("");
    onClose();
  }

  async function handleSubmitLoggedIn(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return toast.error("Morate biti prijavljeni.");
    if (!selectedDate || !selectedTime)
      return toast.error("Molimo izaberite datum i vreme.");
    if (!selectedService) return toast.error("Izabrana usluga nije pronađena.");
    if (selectedService.type === "variant" && !selectedVariant)
      return toast.error("Molimo izaberite varijantu usluge.");

    const extrasForStorage = selectedExtras.map((extraName) => {
      const extra = selectedService.extras?.find((e) => e.name === extraName);
      return {
        name: extraName,
        price: extra?.price || 0,
        duration: extra?.duration || 0,
        perItem: extra?.perItem || false,
      };
    });

    const payload: IAppointment = {
      clientId: user._id,
      clientName: user.name,
      clientEmail: user.email,
      serviceName: `${selectedService.name}${selectedVariant ? ` - ${selectedVariant}` : ""}`,
      services: [
        {
          serviceId: selectedServiceId || "",
          serviceName:
            selectedService.type === "variant"
              ? selectedVariant
              : selectedService.name,
          extras: extrasForStorage.length > 0 ? extrasForStorage : undefined,
          quantity: 1,
          price: totalPrice,
          duration: totalDuration,
        },
      ],
      date: selectedDate,
      time: selectedTime,
      duration: totalDuration,
      note: note || undefined,
      status: "pending",
      messages: [],
      adminNotified: true,
      clientNotified: false,
      lastUpdatedBy: "client",
    };

    try {
      await createAppointment.mutateAsync(payload);
      handleClose();
    } catch {
      toast.error("Greška pri kreiranju termina.");
    }
  }

  function handleGuestReserve(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate || !selectedTime)
      return toast.error("Molimo izaberite datum i vreme.");
    if (!selectedService) return toast.error("Izabrana usluga nije pronađena.");
    if (selectedService.type === "variant" && !selectedVariant)
      return toast.error("Molimo izaberite varijantu usluge.");

    onConfirmedByGuest({
      date: selectedDate,
      time: selectedTime,
      serviceId: selectedServiceId,
      variantName: selectedVariant,
      extras: selectedExtras,
      note,
      totalPrice,
      totalDuration,
    });
  }

  const isPendingMode = !!pendingDefaults;

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/50" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Zakazivanje termina
              </h3>
              {isPendingMode && (
                <p className="text-sm text-violet-600 font-medium mt-1">
                  Dobrodošli nazad! Vaš termin čeka potvrdu.
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Auth info */}
          {isLoggedIn ? (
            <div className="mb-4 p-3 bg-violet-50 rounded-xl border border-violet-100">
              <p className="text-xs text-violet-700 font-semibold">
                Zakazujete kao: {userName} ({userEmail})
              </p>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-xs text-amber-700 font-semibold">
                Niste prijavljeni. Popunite formu i kliknite &quot;Postavi za
                rezervaciju&quot; — bićete preusmereni na prijavu. Nakon prijave
                vaš termin će biti potvrđen.
              </p>
            </div>
          )}

          <form
            onSubmit={isLoggedIn ? handleSubmitLoggedIn : handleGuestReserve}
            className="flex-1 flex flex-col gap-4"
          >
            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Datum *
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="block w-full rounded-xl border border-gray-200 bg-gray-50 text-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  required
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Vreme *
                </label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  step={1800}
                  className="block w-full rounded-xl border border-gray-200 bg-gray-50 text-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  required
                />
              </div>
            </div>

            {/* Service */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Usluga *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {services.map((s) => (
                  <label
                    key={s._id}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                      selectedServiceId === s._id
                        ? "border-violet-500 bg-violet-50"
                        : "border-gray-200 hover:border-violet-200 bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="service"
                      value={s._id}
                      checked={selectedServiceId === s._id}
                      onChange={() => {
                        setSelectedServiceId(s._id);
                        setSelectedVariant("");
                        setSelectedExtras([]);
                      }}
                      className="sr-only"
                    />
                    <span
                      className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${
                        selectedServiceId === s._id
                          ? "border-violet-500 bg-violet-500"
                          : "border-gray-300 bg-white"
                      }`}
                    />
                    <span className="text-sm font-medium text-gray-800">
                      {s.name}
                    </span>
                  </label>
                ))}
              </div>

              {/* Variants */}
              {selectedService?.type === "variant" &&
                selectedService.variants &&
                selectedService.variants.length > 0 && (
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-gray-600 mb-2">
                      Varijanta *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedService.variants.map((v, idx) => (
                        <label
                          key={idx}
                          className={`flex items-start p-3 rounded-xl border cursor-pointer transition-colors ${
                            selectedVariant === v.name
                              ? "border-violet-500 bg-violet-50"
                              : "border-gray-200 hover:border-violet-200 bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="variant"
                            value={v.name}
                            checked={selectedVariant === v.name}
                            onChange={() => setSelectedVariant(v.name)}
                            className="sr-only"
                          />
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {v.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {formatPriceToString(v.price)} RSD
                              {v.duration ? ` • ${v.duration} min` : ""}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

              {/* Extras */}
              {selectedService?.extras && selectedService.extras.length > 0 && (
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-gray-600 mb-2">
                    Dodatne opcije
                  </label>
                  <div className="space-y-2">
                    {selectedService.extras.map((extra, idx) => (
                      <label
                        key={idx}
                        className="flex items-center justify-between px-3 py-2 rounded-xl border border-gray-200 cursor-pointer hover:border-violet-200 bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedExtras.includes(extra.name)}
                            onChange={() =>
                              setSelectedExtras((prev) =>
                                prev.includes(extra.name)
                                  ? prev.filter((n) => n !== extra.name)
                                  : [...prev, extra.name],
                              )
                            }
                            className="rounded text-violet-600"
                          />
                          <span className="text-sm text-gray-800">
                            {extra.name}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-violet-600">
                          +{formatPriceToString(extra.price || 0)} RSD
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Price summary */}
              {selectedService && (
                <div className="mt-3 flex items-center justify-between bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
                  <div>
                    <div className="text-xs text-gray-500">Ukupno</div>
                    <div className="text-xs text-gray-400">
                      {totalDuration} min
                    </div>
                  </div>
                  <div className="text-xl font-bold text-violet-700">
                    {formatPriceToString(totalPrice)} RSD
                  </div>
                </div>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Napomena (opciono)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="block w-full rounded-xl border border-gray-200 bg-gray-50 text-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 placeholder:text-gray-400"
                rows={2}
                placeholder="Dodatne napomene..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
              >
                Otkaži
              </button>

              {isLoggedIn ? (
                <button
                  type="submit"
                  disabled={
                    createAppointment.isPending ||
                    (selectedService?.type === "variant" && !selectedVariant)
                  }
                  className="px-5 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition disabled:opacity-50 cursor-pointer"
                >
                  {createAppointment.isPending
                    ? "Zakazivanje..."
                    : "Zakaži termin"}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={
                    selectedService?.type === "variant" && !selectedVariant
                  }
                  className="px-5 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition disabled:opacity-50 cursor-pointer"
                >
                  Postavi za rezervaciju →
                </button>
              )}
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

// ─── DayView ──────────────────────────────────────────────────────────────────

function DayView({
  selectedDate,
  appointments,
  workingHours,
  onSlotClick,
}: {
  selectedDate: Date;
  appointments: PublicAppt[];
  workingHours: WorkingHoursMap | undefined;
  onSlotClick: (date: string, time: string) => void;
}) {
  const { isWorking, start, end } = getWorkingRange(workingHours, selectedDate);
  const slots = useMemo(
    () => (isWorking ? generateSlots(start, end) : []),
    [isWorking, start, end],
  );
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const now = new Date();

  if (!isWorking) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2 rounded-2xl border-2 border-red-200 bg-red-50 text-red-400">
        <span className="text-2xl">🔒</span>
        <span className="text-sm font-semibold">Salon ne radi ovim danom</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {slots.map((slot) => {
        const booked = isSlotBooked(appointments, dateStr, slot);
        const isPast = new Date(`${dateStr}T${slot}`) < now;

        if (booked) {
          return (
            <div
              key={slot}
              className="flex flex-col items-center justify-center gap-0.5 px-3 py-3 rounded-xl bg-black border-2 border-black text-white select-none"
              title="Termin zauzet"
            >
              <span className="text-xs font-bold">{slot}</span>
              <span className="text-[10px] opacity-60 font-medium">
                Zauzeto
              </span>
            </div>
          );
        }

        if (isPast) {
          return (
            <div
              key={slot}
              className="flex flex-col items-center justify-center px-3 py-3 rounded-xl border border-dashed border-gray-200 opacity-30 select-none"
            >
              <span className="text-xs font-bold text-gray-400">{slot}</span>
            </div>
          );
        }

        return (
          <button
            key={slot}
            onClick={() => onSlotClick(dateStr, slot)}
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-3 rounded-xl border-2 border-gray-200 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 transition-all group cursor-pointer bg-white"
          >
            <span className="text-xs font-bold text-gray-600 group-hover:text-violet-700">
              {slot}
            </span>
            <span className="text-[10px] text-gray-300 group-hover:text-violet-400 font-medium">
              + Zakaži
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── WeekView ─────────────────────────────────────────────────────────────────

function WeekView({
  weekStart,
  appointments,
  workingHours,
  selectedDate,
  onDayClick,
}: {
  weekStart: Date;
  appointments: PublicAppt[];
  workingHours: WorkingHoursMap | undefined;
  selectedDate: Date;
  onDayClick: (day: Date) => void;
}) {
  const days = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(weekStart, { weekStartsOn: 1 }),
  });

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const { isWorking, start, end } = getWorkingRange(workingHours, day);
        const slots = isWorking ? generateSlots(start, end) : [];
        const fullyBooked =
          isWorking && isDayFullyBooked(appointments, slots, dateStr);
        const bookedCount = slots.filter((s) =>
          isSlotBooked(appointments, dateStr, s),
        ).length;
        const isSelected = isSameDay(day, selectedDate);
        const isToday = isSameDay(day, new Date());

        return (
          <button
            key={dateStr}
            onClick={() => isWorking && onDayClick(day)}
            className={`flex flex-col items-stretch gap-1 p-2 rounded-xl border-2 transition min-h-[90px] text-left ${
              !isWorking
                ? "border-red-200 bg-red-50 cursor-default"
                : isSelected
                  ? "border-violet-500 bg-violet-50 cursor-pointer"
                  : isToday
                    ? "border-amber-300 bg-amber-50 cursor-pointer hover:border-violet-300"
                    : "border-gray-200 bg-white cursor-pointer hover:border-violet-300 hover:bg-violet-50 shadow-sm"
            }`}
          >
            {/* Day header */}
            <div className="text-center">
              <span
                className={`text-[9px] font-bold uppercase tracking-wide ${
                  !isWorking
                    ? "text-red-300"
                    : isToday
                      ? "text-amber-500"
                      : "text-gray-400"
                }`}
              >
                {format(day, "EEE", { locale: sr })}
              </span>
              <p
                className={`text-sm font-bold leading-none mt-0.5 ${
                  !isWorking
                    ? "text-red-300"
                    : isToday
                      ? "text-amber-600"
                      : isSelected
                        ? "text-violet-600"
                        : "text-gray-700"
                }`}
              >
                {format(day, "d")}
              </p>
            </div>

            {/* Status */}
            {!isWorking ? (
              <span className="text-[8px] text-red-400 font-semibold text-center leading-tight">
                Neradan
              </span>
            ) : fullyBooked ? (
              <span className="text-[8px] bg-black text-white font-semibold text-center px-1 py-0.5 rounded-md leading-tight">
                Popunjeno
              </span>
            ) : bookedCount > 0 ? (
              <span className="text-[8px] text-violet-500 font-semibold text-center leading-tight">
                {slots.length - bookedCount} slobodnih
              </span>
            ) : (
              <span className="text-[8px] text-green-500 font-semibold text-center leading-tight">
                Slobodan
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  tenantSlug?: string;
  clientSlug?: string;
  salon: SalonProfileData;
  services: IService[];
}

type ViewMode = "week" | "day";

export default function HomepageAppointmentWidget({
  tenantSlug,
  clientSlug,
  salon,
  services,
}: Props) {
  const { user, token } = useAuth();
  const isLoggedIn = !!user;

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState("");
  const [modalTime, setModalTime] = useState("");
  const [pendingDefaults, setPendingDefaults] = useState<Omit<
    PendingAppointment,
    "tenantSlug"
  > | null>(null);

  // Day strip offset (for arrow navigation beyond the initial window)
  const [stripOffset, setStripOffset] = useState(-3); // days from today
  const stripScrollRef = useRef<HTMLDivElement>(null);

  // ── Fetch public appointments ──────────────────────────────────────────────
  const { data: appointments = [], isLoading } = useQuery<PublicAppt[]>({
    queryKey: ["pub-appts-widget", tenantSlug],
    queryFn: async () => {
      if (!tenantSlug) return [];
      const res = await fetch(`/api/public/${tenantSlug}/appointments`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!tenantSlug,
    refetchInterval: 30_000,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const workingHours = salon.workingHours as WorkingHoursMap | undefined;

  // ── Pending appointment restore on mount ───────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    try {
      const raw = sessionStorage.getItem(PENDING_STORAGE_KEY);
      if (!raw) return;
      const pending = JSON.parse(raw) as PendingAppointment;
      // Only restore if it matches this tenant
      if (pending.tenantSlug && clientSlug && pending.tenantSlug !== clientSlug)
        return;

      // Validate date is in the future
      const slotDt = new Date(`${pending.date}T${pending.time}`);
      if (slotDt < new Date()) {
        sessionStorage.removeItem(PENDING_STORAGE_KEY);
        return;
      }

      sessionStorage.removeItem(PENDING_STORAGE_KEY);
      async function handleChangeStates() {
        setPendingDefaults({
          date: pending.date,
          time: pending.time,
          serviceId: pending.serviceId,
          variantName: pending.variantName,
          extras: pending.extras,
          note: pending.note,
          totalPrice: pending.totalPrice,
          totalDuration: pending.totalDuration,
        });
        setModalDate(pending.date);
        setModalTime(pending.time);
        setModalOpen(true);
      }
      handleChangeStates();
      toast.success("Vaš termin je sačuvan — možete ga potvrditi.");
    } catch {
      /* ignore */
    }
  }, [isLoggedIn, clientSlug]);

  // ── Slot click handler ─────────────────────────────────────────────────────
  const handleSlotClick = useCallback((date: string, time: string) => {
    const slotDate = new Date(`${date}T${time}`);
    if (slotDate < new Date())
      return toast.error("Ne možete zakazati za prošli termin.");
    setModalDate(date);
    setModalTime(time);
    setPendingDefaults(null);
    setModalOpen(true);
  }, []);

  // ── Day click (week → day view) ────────────────────────────────────────────
  function handleDayClick(day: Date) {
    setSelectedDate(day);
    setViewMode("day");
  }

  // ── Guest reserve: save to sessionStorage + redirect ──────────────────────
  function handleGuestConfirm(data: Omit<PendingAppointment, "tenantSlug">) {
    const pending: PendingAppointment = {
      ...data,
      tenantSlug: clientSlug ?? tenantSlug ?? "",
    };
    try {
      sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pending));
    } catch {
      /* ignore */
    }

    const isCustomDomain = detectCustomDomain();
    const base = isCustomDomain ? "" : clientSlug ? `/${clientSlug}` : "";
    const loginUrl = `${base}/login?pendingBooking=1`;
    window.location.href = loginUrl;
  }

  // ── Navigation label ───────────────────────────────────────────────────────
  const navLabel =
    viewMode === "week"
      ? `${format(weekStart, "d. MMM", { locale: sr })} – ${format(endOfWeek(weekStart, { weekStartsOn: 1 }), "d. MMM yyyy.", { locale: sr })}`
      : format(selectedDate, "EEEE, d. MMMM yyyy.", { locale: sr });

  // ── Day strip days ─────────────────────────────────────────────────────────
  const stripDays = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) =>
        addDays(new Date(), stripOffset + i),
      ),
    [stripOffset],
  );

  return (
    <>
      <Toaster position="top-right" />

      <div className="space-y-4">
        {/* Calendar card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-gray-100">
            {/* View toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {(["week", "day"] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    viewMode === v
                      ? "bg-white text-violet-700 shadow-sm"
                      : "text-gray-400 hover:text-gray-700"
                  }`}
                >
                  {v === "week" ? "Sedmica" : "Dan"}
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  viewMode === "week"
                    ? setWeekStart((w) => subWeeks(w, 1))
                    : setSelectedDate((d) => subDays(d, 1))
                }
                className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-gray-800 min-w-[180px] text-center capitalize">
                {navLabel}
              </span>
              <button
                onClick={() =>
                  viewMode === "week"
                    ? setWeekStart((w) => addWeeks(w, 1))
                    : setSelectedDate((d) => addDays(d, 1))
                }
                className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  setSelectedDate(today);
                  setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
                  setStripOffset(-3);
                }}
                className="ml-1 px-3 py-1.5 text-xs font-semibold bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition cursor-pointer"
              >
                Danas
              </button>
            </div>

            {/* Book CTA */}
            <button
              onClick={() => {
                setModalDate(format(selectedDate, "yyyy-MM-dd"));
                setModalTime("");
                setPendingDefaults(null);
                setModalOpen(true);
              }}
              className="px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-xl hover:bg-violet-700 transition cursor-pointer"
            >
              + Zakaži termin
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm gap-2">
                <div className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                Učitavanje termina...
              </div>
            ) : viewMode === "week" ? (
              <WeekView
                weekStart={weekStart}
                appointments={appointments}
                workingHours={workingHours}
                selectedDate={selectedDate}
                onDayClick={handleDayClick}
              />
            ) : (
              <>
                {/* Day strip with arrows */}
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setStripOffset((o) => o - 1)}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                    aria-label="Prethodni dan"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>

                  <div
                    ref={stripScrollRef}
                    className="flex gap-1.5 overflow-x-auto pb-1 flex-1 scrollbar-none"
                  >
                    {stripDays.map((day, i) => {
                      const isSelected = isSameDay(day, selectedDate);
                      const isToday = isSameDay(day, new Date());
                      const { isWorking } = getWorkingRange(workingHours, day);
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedDate(day)}
                          className={`flex flex-col items-center flex-shrink-0 w-11 h-14 rounded-xl border-2 transition cursor-pointer ${
                            isSelected
                              ? "bg-violet-600 border-violet-600 text-white"
                              : isToday
                                ? "border-amber-300 bg-amber-50 text-amber-700"
                                : !isWorking
                                  ? "border-red-200 bg-red-50 text-red-300"
                                  : "border-gray-200 bg-white text-gray-600 hover:border-violet-300"
                          }`}
                        >
                          <span className="text-[9px] uppercase font-bold mt-2">
                            {format(day, "EEE", { locale: sr })}
                          </span>
                          <span className="text-sm font-bold">
                            {format(day, "d")}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setStripOffset((o) => o + 1)}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                    aria-label="Sledeći dan"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>

                <DayView
                  selectedDate={selectedDate}
                  appointments={appointments}
                  workingHours={workingHours}
                  onSlotClick={handleSlotClick}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setPendingDefaults(null);
        }}
        defaultDate={modalDate}
        defaultTime={modalTime}
        services={services}
        isLoggedIn={isLoggedIn}
        userName={user?.name}
        userEmail={user?.email}
        token={token ?? undefined}
        onConfirmedByGuest={handleGuestConfirm}
        pendingDefaults={pendingDefaults}
      />
    </>
  );
}
