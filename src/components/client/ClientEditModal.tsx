"use client";

import React, { useMemo, useState } from "react";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { XMarkIcon, TrashIcon, ClockIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import type { WorkingHoursInput } from "@/helpers/parseWorkingHours";
import { availableTimesForDate } from "@/lib/booking/availabilityAdapter";
import {
  manualTimesForDate,
  isManualSlotTaken,
  timeToMin,
} from "@/helpers/manualSlots";
import { IAppointment, ManualSlotsMap } from "@/types";
import { useAppointmentMutations } from "@/hooks/useAppointmentMutations";
import { useServices } from "@/hooks/useServices";
import { formatPriceToString, formatServicePrice } from "@/helpers/formatPrice";
import { motion } from "framer-motion";
import AlertModal from "../modals/AlertModal";
import {
  clientAppointmentPhase,
  isClientActionableStatus,
} from "@/lib/appointments/cancellation";
import { statusMeta } from "@/lib/appointmentColors";
import { useTenant } from "@/contexts/TenantContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  appointment: IAppointment | null;
  token?: string;
  /** "manualSlots" ograničava pomeranje na termine koje je vlasnik definisao. */
  availabilityMode?: string;
  /** Radno vreme salona — klasičan režim gradi dropdown dostupnih vremena. */
  workingHours?: WorkingHoursInput;
  manualSlots?: ManualSlotsMap;
  bookedAppointments?: {
    _id?: string;
    date: string;
    time: string;
    duration?: number;
  }[];
}

const inp = [
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm",
  "text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800",
  "focus:outline-none focus:ring-2 focus:ring-violet-400 transition",
  "placeholder:text-gray-400 dark:placeholder:text-gray-500",
].join(" ");

const lbl =
  "block text-[11px] font-bold text-gray-400 dark:text-gray-300 uppercase tracking-widest mb-1.5";

export default function ClientEditModal({
  isOpen,
  onClose,
  appointment,
  token,
  availabilityMode,
  workingHours,
  manualSlots,
  bookedAppointments,
}: Props) {
  const { updateClientAppointment, cancelClientAppointment } =
    useAppointmentMutations(token);
  const { data: services = [] } = useServices();
  const { clientGender } = useTenant();
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>(
    appointment?.date ?? "",
  );
  const [selectedTime, setSelectedTime] = useState<string>(
    appointment?.time ?? "",
  );
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    appointment?.services?.[0]?.serviceId ?? "",
  );
  const [selectedVariant, setSelectedVariant] = useState<string>(
    appointment?.services?.[0]?.serviceName ?? "",
  );
  const [selectedExtras, setSelectedExtras] = useState<string[]>(
    appointment?.services?.[0]?.extras?.map((e) => e.name) ?? [],
  );
  const [note, setNote] = useState<string>(appointment?.note ?? "");

  // manualSlots režim: pomeranje je moguće samo na slobodan termin koji je
  // vlasnik definisao; sopstveni termin se izuzima iz provere zauzeća, a
  // originalno vreme ostaje u ponudi da izmena usluge/napomene ne bude blokirana.
  const isManualMode = availabilityMode === "manualSlots";
  const manualTimeOptions = useMemo(() => {
    if (!isManualMode || !selectedDate || !appointment) return [];
    const now = new Date();
    const others = (bookedAppointments ?? []).filter(
      (a) => a._id !== appointment._id,
    );
    const opts = manualTimesForDate(manualSlots, selectedDate)
      .filter(
        (s) =>
          new Date(`${selectedDate}T${s.time}`) >= now &&
          !isManualSlotTaken(others, selectedDate, timeToMin(s.time), s.duration),
      )
      .map((s) => ({ time: s.time, duration: s.duration }));
    if (
      selectedDate === appointment.date &&
      !opts.some((o) => o.time === appointment.time)
    ) {
      opts.push({
        time: appointment.time,
        duration: appointment.duration ?? 60,
      });
      opts.sort((a, b) => timeToMin(a.time) - timeToMin(b.time));
    }
    return opts;
  }, [isManualMode, manualSlots, bookedAppointments, selectedDate, appointment]);

  const manualSlotInvalid =
    isManualMode &&
    !!appointment &&
    !manualTimeOptions.some((o) => o.time === selectedTime);

  if (!appointment) return null;

  // Izmena i otkazivanje više nisu isto pravo:
  //   open    → i izmena i otkazivanje
  //   late    → SAMO otkazivanje, uz upozorenje (postaje kasno otkazivanje)
  //   started → ništa; status termina rešava salon
  //   unknown → ništa; vreme termina se ne može pouzdano pročitati
  const phase = isClientActionableStatus(appointment.status)
    ? clientAppointmentPhase(appointment)
    : "started";
  const canEdit = phase === "open";
  const isLateCancel = phase === "late";
  const canCancel = phase === "open" || phase === "late";
  const selectedService = services.find((s) => s._id === selectedServiceId);

  const calculateTotal = () => {
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
    } else if (selectedService.type === "group") {
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
  };

  const { price: totalPrice, duration: totalDuration } = calculateTotal();

  // Klasičan režim: ponuda vremena = radno vreme − zauzeto − prošlost;
  // sopstveni postojeći termin se NE računa kao zauzet (izmena bez pomeranja).
  // Bez useMemo: računica je jeftina, a komponenta ima raniji return null
  // pa bi uslovni hook prekršio rules-of-hooks.
  const bookedWithoutOwn = (bookedAppointments ?? []).filter(
    (b) =>
      !(
        appointment &&
        b.date === appointment.date &&
        b.time === appointment.time
      ),
  );
  const timeOptions = availableTimesForDate({
    tenantId: "client-edit",
    localDate: selectedDate,
    durationMinutes: totalDuration || 60,
    profile: { workingHours },
    appointments: bookedWithoutOwn,
    now: new Date(),
  });
  const classicTimeOptions =
    selectedTime && !timeOptions.includes(selectedTime)
      ? [selectedTime, ...timeOptions]
      : timeOptions;

  const handleUpdate = async () => {
    if (!selectedService) return toast.error("Molimo izaberite uslugu.");
    if (manualSlotInvalid)
      return toast.error(
        "Izabrani termin nije dostupan. Izaberite jedan od ponuđenih termina.",
      );
    if (selectedService.type === "variant" && !selectedVariant)
      return toast.error("Molimo izaberite varijantu.");

    const extrasForStorage = selectedExtras.map((extraName) => {
      const extra = selectedService.extras?.find((e) => e.name === extraName);
      return {
        name: extraName,
        price: extra?.price || 0,
        duration: extra?.duration || 0,
        perItem: extra?.perItem || false,
      };
    });

    const dateChanged = selectedDate !== appointment.date;
    const timeChanged = selectedTime !== appointment.time;

    const updateData: Partial<IAppointment> = {
      date: selectedDate,
      time: selectedTime,
      serviceName: `${selectedService.name}${selectedVariant ? ` - ${selectedVariant}` : ""}`,
      note: note || undefined,
      duration: totalDuration,
      services: [
        {
          serviceId: selectedServiceId,
          serviceName:
            selectedService.type === "variant"
              ? selectedVariant
              : selectedService.name,
          extras:
            extrasForStorage.length > 0 ? extrasForStorage : undefined,
          quantity: 1,
          price: totalPrice,
          duration: totalDuration,
        },
      ],
      lastUpdatedBy: "client",
      ...(dateChanged || timeChanged
        ? { status: "appointment_rescheduled" }
        : {}),
    };

    try {
      await updateClientAppointment.mutateAsync({
        id: appointment._id!,
        updatedData: updateData,
      });
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Greška pri ažuriranju termina.",
      );
    }
  };

  const handleDelete = async () => {
    try {
      await cancelClientAppointment.mutateAsync(appointment._id!);
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Greška pri otkazivanju termina.",
      );
    }
  };

  const handleExtraToggle = (extraName: string) => {
    setSelectedExtras((prev) =>
      prev.includes(extraName)
        ? prev.filter((n) => n !== extraName)
        : [...prev, extraName],
    );
  };

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/80" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="max-w-xl w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 overflow-y-auto max-h-[90vh]">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Moj termin
                </h3>
                <span
                  className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${statusMeta(appointment.status).chip}`}
                >
                  {statusMeta(appointment.status, clientGender).label}
                </span>
              </div>
              <button
                onClick={onClose}
                className="cursor-pointer text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 mt-0.5"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Upozorenje po fazi — „rok je prošao" i „termin je počeo" nisu
                ista poruka, a nečitljivo vreme nije ni jedno ni drugo. */}
            {phase !== "open" && (
              <div className="mb-4 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                <ClockIcon className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {phase === "late"
                    ? "Rok za izmenu termina je prošao. Termin i dalje možete otkazati, ali će biti evidentirano kao kasno otkazivanje."
                    : phase === "started"
                      ? "Termin je već započeo. Za izmenu statusa kontaktirajte salon."
                      : "Nije moguće izmeniti termin. Kontaktirajte salon."}
                </span>
              </div>
            )}

            {canEdit ? (
              <div className="space-y-4">
                {/* Date */}
                <div>
                  <label className={lbl}>Datum</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      if (isManualMode) setSelectedTime("");
                    }}
                    className={inp}
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>

                {/* Time */}
                <div>
                  <label className={lbl}>Vreme</label>
                  <select
                    value={isManualMode && manualSlotInvalid ? "" : selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className={inp}
                    required
                  >
                    <option value="">
                      {isManualMode
                        ? "— izaberite termin —"
                        : "— izaberite vreme —"}
                    </option>
                    {isManualMode
                      ? manualTimeOptions.map((o) => (
                          <option key={o.time} value={o.time}>
                            {o.time} ({o.duration} min)
                          </option>
                        ))
                      : classicTimeOptions.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                  </select>
                  {isManualMode &&
                    selectedDate &&
                    manualTimeOptions.length === 0 && (
                      <p className="mt-1 text-xs font-semibold text-red-500">
                        Nema slobodnih termina za izabrani datum.
                      </p>
                    )}
                  {!isManualMode &&
                    selectedDate &&
                    classicTimeOptions.length === 0 && (
                      <p className="mt-1 text-xs font-semibold text-red-500">
                        Nema slobodnih vremena za izabrani datum.
                      </p>
                    )}
                </div>

                {/* Service */}
                <div>
                  <label className={lbl}>Usluga</label>
                  <div className="flex flex-col lg:grid lg:grid-cols-2 mt-2 gap-2">
                    {services.map((s) => (
                      <div
                        key={s._id}
                        className="flex gap-x-3 items-center rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-2"
                      >
                        <input
                          id={`svc-${s._id}`}
                          name="service"
                          type="radio"
                          value={s._id}
                          checked={selectedServiceId === s._id}
                          onChange={() => {
                            setSelectedServiceId(s._id);
                            setSelectedVariant("");
                            setSelectedExtras([]);
                          }}
                          className="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-(--primary-color) checked:bg-(--primary-color) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary-color) disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden"
                        />
                        <label
                          htmlFor={`svc-${s._id}`}
                          className="block text-sm/6 font-medium text-gray-900 dark:text-gray-100"
                        >
                          {s.name}
                        </label>
                      </div>
                    ))}
                  </div>

                  {selectedService && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="mt-4 space-y-4"
                    >
                      {/* Variants */}
                      {selectedService.type === "variant" &&
                        selectedService.variants &&
                        selectedService.variants.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Izaberite varijantu:
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {selectedService.variants.map((v, i) => (
                                <label
                                  key={i}
                                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                                    selectedVariant === v.name
                                      ? "border-(--primary-color) bg-(--primary-color)/5"
                                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="variant"
                                    value={v.name}
                                    checked={selectedVariant === v.name}
                                    onChange={(e) =>
                                      setSelectedVariant(e.target.value)
                                    }
                                    className="mr-3"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900 dark:text-gray-100">
                                      {v.name}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                      {formatServicePrice(v.price, v.priceMode)}
                                      {v.duration && ` • ${v.duration} min`}
                                    </div>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Extras */}
                      {selectedService.extras &&
                        selectedService.extras.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Dodatne opcije (opciono):
                            </label>
                            <div className="space-y-2">
                              {selectedService.extras.map((extra, i) => (
                                <label
                                  key={i}
                                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-gray-300 dark:hover:border-gray-500"
                                >
                                  <div className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedExtras.includes(
                                        extra.name,
                                      )}
                                      onChange={() =>
                                        handleExtraToggle(extra.name)
                                      }
                                      className="mr-3"
                                    />
                                    <div>
                                      <div className="font-medium text-gray-900 dark:text-gray-100">
                                        {extra.name}
                                      </div>
                                      {extra.perItem && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                          (po stavci)
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-(--secondary-color) font-semibold">
                                    +
                                    {formatServicePrice(
                                      extra.price || 0,
                                      extra.priceMode,
                                    )}
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Total */}
                      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">
                              Ukupno:
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {totalDuration} min
                            </div>
                            {selectedVariant && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Varijanta: {selectedVariant}
                              </div>
                            )}
                          </div>
                          <div className="text-lg font-bold text-(--secondary-color)">
                            {formatPriceToString(totalPrice)} RSD
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Note */}
                <div>
                  <label className={lbl}>Napomena</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className={inp}
                    placeholder="Dodatne napomene..."
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-col lg:flex-row justify-between items-center gap-3 pt-2">
                  {canCancel ? (
                    <button
                      type="button"
                      onClick={() => setIsAlertOpen(true)}
                      className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition"
                    >
                      <TrashIcon className="w-4 h-4" /> Otkaži termin
                    </button>
                  ) : (
                    <span />
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="cursor-pointer px-4 py-2 bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded text-sm"
                    >
                      Otkaži
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdate}
                      disabled={
                        updateClientAppointment.isPending ||
                        manualSlotInvalid ||
                        (selectedService?.type === "variant" && !selectedVariant)
                      }
                      className="cursor-pointer px-4 py-2 bg-(--secondary-color) hover:bg-(--secondary-color)/90 text-white rounded disabled:opacity-50 text-sm"
                    >
                      {updateClientAppointment.isPending
                        ? "Čuvanje..."
                        : "Sačuvaj izmene"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Read-only view */
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <div className={lbl}>Datum</div>
                    <div className="font-semibold text-gray-800 dark:text-gray-200">
                      {appointment.date}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <div className={lbl}>Vreme</div>
                    <div className="font-semibold text-gray-800 dark:text-gray-200">
                      {appointment.time}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                  <div className={lbl}>Usluga</div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200">
                    {appointment.serviceName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {appointment.duration} min
                  </div>
                </div>
                {appointment.note && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <div className={lbl}>Napomena</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {appointment.note}
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center gap-3">
                  {/* Posle roka izmena više nije moguća, ali otkazivanje jeste —
                      bolje da se klijentkinja javi nego da salon čeka. */}
                  {canCancel ? (
                    <button
                      type="button"
                      onClick={() => setIsAlertOpen(true)}
                      className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition text-sm"
                    >
                      <TrashIcon className="w-4 h-4" /> Otkaži termin
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    onClick={onClose}
                    className="cursor-pointer px-4 py-2 bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300"
                  >
                    Zatvori
                  </button>
                </div>
              </div>
            )}
          </DialogPanel>
        </div>
      </Dialog>

      <AlertModal
        open={isAlertOpen}
        setOpen={setIsAlertOpen}
        onConfirm={handleDelete}
        title={
          isLateCancel
            ? "Rok za regularno otkazivanje je prošao"
            : "Otkaži termin"
        }
        message={
          isLateCancel
            ? "Ako sada otkažete termin, otkazivanje će biti evidentirano kao kasno i mogu se primeniti pravila salona za nedolazak."
            : "Da li želite da otkažete termin?"
        }
        confirmLabel={isLateCancel ? "Otkaži ipak" : "Otkaži termin"}
        cancelLabel="Odustani"
      />
    </>
  );
}
