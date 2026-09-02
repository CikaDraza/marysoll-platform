import {
  formatPriceToString,
  formatServicePrice,
  PRICE_ON_REQUEST_LABEL,
} from "@/helpers/formatPrice";
import { estimateServicePrice } from "@/helpers/servicePrice";
import { serviceRequiresIntake } from "@/lib/appointments/serviceIntake";
import type { WorkingHoursInput } from "@/helpers/parseWorkingHours";
import { availableTimesForDate } from "@/lib/booking/availabilityAdapter";
import {
  manualTimesForDate,
  isManualSlotTaken,
  timeToMin,
} from "@/helpers/manualSlots";
import { useAppointmentMutations } from "@/hooks/useAppointmentMutations";
import { useAuth } from "@/hooks/useAuth";
import { useServices } from "@/hooks/useServices";
import type {
  IAppointment,
  IAppointmentAttachment,
  IAppointmentRequest,
  ManualSlotsMap,
} from "@/types";
import { useTenant } from "@/contexts/TenantContext";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  defaultTime?: string;
  token?: string;
  /** "manualSlots" ograničava izbor na termine koje je vlasnik definisao. */
  availabilityMode?: string;
  /** Radno vreme salona — klasičan režim gradi dropdown dostupnih vremena. */
  workingHours?: WorkingHoursInput;
  manualSlots?: ManualSlotsMap;
  bookedAppointments?: { date: string; time: string; duration?: number }[];
}

export default function ClientCreateModal({
  isOpen,
  onClose,
  defaultDate,
  defaultTime,
  token,
  availabilityMode,
  workingHours,
  manualSlots,
  bookedAppointments,
}: Props) {
  const { user, isLoading } = useAuth();
  const { data: services = [], isLoading: servicesLoading } = useServices();
  const { createAppointment } = useAppointmentMutations(token);


  const { tenantSlug } = useTenant();
  const [selectedDate, setSelectedDate] = useState<string>(defaultDate ?? "");
  const [selectedTime, setSelectedTime] = useState<string>(defaultTime ?? "");
  const [selectedServiceId, setSelectedServiceId] = useState(
    servicesLoading ? "" : services[0]?._id,
  );
  const [selectedVariant, setSelectedVariant] = useState<string>(""); // Promenjeno u string
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [note, setNote] = useState("");

  // Zahtev klijentkinje — isti ugovor kao u javnom widgetu
  // (`Appointment.request`), samo drugi UI. Sve opciono.
  const [intakeNote, setIntakeNote] = useState("");
  const [intakeReferenceUrl, setIntakeReferenceUrl] = useState("");
  const [intakeImage, setIntakeImage] =
    useState<IAppointmentAttachment | null>(null);
  const [intakeUploading, setIntakeUploading] = useState(false);
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [intakeSkipped, setIntakeSkipped] = useState(false);
  const intakeFileRef = useRef<HTMLInputElement>(null);

  const selectedService = services.find((s) => s._id === selectedServiceId);

  // manualSlots režim: nudi se samo slobodan budući termin koji je vlasnik definisao.
  const isManualMode = availabilityMode === "manualSlots";
  const availableManualTimes = useMemo(() => {
    if (!isManualMode || !selectedDate) return [];
    const now = new Date();
    return manualTimesForDate(manualSlots, selectedDate).filter(
      (s) =>
        new Date(`${selectedDate}T${s.time}`) >= now &&
        !isManualSlotTaken(
          bookedAppointments ?? [],
          selectedDate,
          timeToMin(s.time),
          s.duration,
        ),
    );
  }, [isManualMode, manualSlots, bookedAppointments, selectedDate]);

  const manualSlotInvalid =
    isManualMode && !availableManualTimes.some((s) => s.time === selectedTime);

  // Cena i trajanje idu kroz CANONICAL procenu — ista koju vidi javni
  // BookingWidget. Ovde je ranije stajala lokalna kopija koja je sabirala
  // `price += extra.price`, pa je usluga na upit sa dodatkom od 700 izgledala
  // kao termin od 700 dinara.
  const estimate = useMemo(
    () =>
      selectedService
        ? estimateServicePrice({
            service: selectedService,
            variantName: selectedVariant,
            extras: selectedExtras.map((name) => ({ name, quantity: 1 })),
          })
        : null,
    [selectedService, selectedVariant, selectedExtras],
  );

  const totalPrice = estimate?.total ?? 0;
  const totalDuration = estimate?.durationMinutes ?? 0;
  const uploadIntakeImage = async (file: File) => {
    if (!tenantSlug) {
      setIntakeError("Otpremanje trenutno nije dostupno.");
      return;
    }
    setIntakeError(null);
    setIntakeUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(
        `/api/public/${tenantSlug}/appointments/intake-upload`,
        { method: "POST", body },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setIntakeError(data?.error ?? "Otpremanje nije uspelo.");
        return;
      }
      setIntakeImage(data as IAppointmentAttachment);
    } catch {
      setIntakeError("Otpremanje nije uspelo. Proverite internet vezu.");
    } finally {
      setIntakeUploading(false);
    }
  };

  /** `undefined` kad klijentkinja nije ništa unela — server ga tada ne upisuje. */
  const buildRequest = (): IAppointmentRequest | undefined => {
    if (!intakeEnabled) return undefined;
    const noteText = intakeNote.trim();
    const ref = intakeReferenceUrl.trim();
    if (!noteText && !ref && !intakeImage) return undefined;
    return {
      ...(noteText ? { note: noteText } : {}),
      ...(ref ? { referenceUrl: ref } : {}),
      ...(intakeImage ? { attachments: [intakeImage] } : {}),
    };
  };

  const totalPriceLabel = !estimate
    ? ""
    : estimate.total == null
      ? PRICE_ON_REQUEST_LABEL
      : estimate.isEstimate
        ? `od ${formatPriceToString(estimate.total)} RSD`
        : `${formatPriceToString(estimate.total)} RSD`;

  // Zahtev klijentkinje — usluga odlučuje, isto kao u javnom widgetu.
  const intakeEnabled = serviceRequiresIntake(selectedService);

  // Klasičan režim: ponuda vremena = radno vreme − zauzeto − prošlost,
  // uračunato trajanje izabrane usluge (UX odluka 2026-07-05).
  const timeOptions = availableTimesForDate({
    tenantId: "client-create",
    localDate: selectedDate,
    durationMinutes: totalDuration || 60,
    profile: { workingHours },
    appointments: bookedAppointments ?? [],
    now: new Date(),
  });
  const classicTimeOptions =
    selectedTime && !timeOptions.includes(selectedTime)
      ? [selectedTime, ...timeOptions]
      : timeOptions;

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();

    if (!user) return toast.error("Morate biti prijavljeni.");
    if (!selectedDate || !selectedTime)
      return toast.error("Molimo izaberite datum i vreme.");
    if (manualSlotInvalid)
      return toast.error(
        "Izabrani termin nije dostupan. Izaberite jedan od ponuđenih termina.",
      );
    if (!selectedService) return toast.error("Izabrana usluga nije pronađena.");

    if (selectedService.type === "variant" && !selectedVariant) {
      return toast.error("Molimo izaberite varijantu usluge.");
    }

    // Priprema extras objekta za čuvanje
    const extrasForStorage = selectedExtras.map((extraName) => {
      const extra = selectedService.extras?.find((e) => e.name === extraName);
      return {
        name: extraName,
        price: extra?.price || 0,
        duration: extra?.duration || 0,
        perItem: extra?.perItem || false,
      };
    });

    // Kreiranje payload-a za appointment
    const payload: IAppointment = {
      clientProfileId: user.tenantUserId ?? undefined,
      clientName: user.name,
      clientEmail: user.email,
      serviceName: `${selectedService.name}${
        selectedVariant ? ` - ${selectedVariant}` : ""
      }`,
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
      request: buildRequest(),
      status: "pending",
      messages: [],
      adminNotified: true,
      clientNotified: false,
      lastUpdatedBy: "client",
    };

    try {
      await createAppointment.mutateAsync(payload);
      handleClose();
    } catch (error) {
      console.error("Error creating appointment:", error);
      toast.error((error as Error).message || "Greška pri kreiranju termina.");
    }
  };

  const handleClose = () => {
    setSelectedDate(defaultDate ?? "");
    setSelectedTime(defaultTime ?? "");
    setSelectedServiceId(services[0]?._id || "");
    setSelectedVariant("");
    setSelectedExtras([]);
    setNote("");
    onClose();
  };

  const handleExtraToggle = (extraName: string) => {
    setSelectedExtras((prev) =>
      prev.includes(extraName)
        ? prev.filter((name) => name !== extraName)
        : [...prev, extraName],
    );
  };

  const handleVariantChange = (variantName: string) => {
    setSelectedVariant(variantName);
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/50" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="max-w-2xl w-full bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6">
            <div className="text-center py-8">
              <p className="text-gray-700 dark:text-gray-300">Učitavanje...</p>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/50" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="max-w-2xl w-full bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 max-h-[90vh] min-h-[90vh] overflow-y-auto flex flex-col">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Zakazivanje termina
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Zakazujete termin kao:
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {user?.name}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {user?.email}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex-1 flex flex-col justify-between my-6"
          >
            <div>
              {/* Pojedinačni termini: termin dolazi ISKLJUČIVO klikom na
                  slobodan slot u kalendaru — bez inputa za datum/vreme. */}
              {isManualMode ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Termin *
                  </label>
                  {selectedDate && selectedTime && !manualSlotInvalid ? (
                    <div className="mt-1 flex items-center justify-between gap-3 rounded-md border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-3 py-2.5">
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                        {selectedDate}
                      </span>
                      <span className="shrink-0 text-sm font-bold text-violet-600 dark:text-violet-400">
                        {selectedTime}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-1 rounded-md border border-dashed border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-2.5">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Zatvorite prozor i izaberite slobodan termin u
                        kalendaru.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Datum *
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-2 focus:outline-2 focus:-outline-offset-2 focus:outline-(--secondary-color)"
                      required
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Vreme *
                    </label>
                    <select
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-2"
                      required
                    >
                      <option value="">— izaberite vreme —</option>
                      {classicTimeOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    {selectedDate && classicTimeOptions.length === 0 && (
                      <p className="mt-1 text-xs font-semibold text-red-500">
                        Nema slobodnih vremena za izabrani datum.
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Usluga *
                </label>
                <div className="flex flex-col lg:grid lg:grid-cols-2 mt-3 gap-x-3 gap-y-2">
                  {services.map((s) => (
                    <div
                      key={s._id}
                      className="flex gap-x-3 items-center rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-2"
                    >
                      <input
                        id={`service-${s._id}`}
                        name="service"
                        type="radio"
                        value={s._id}
                        checked={selectedServiceId === s._id}
                        onChange={() => {
                          setSelectedServiceId(s._id);
                          setSelectedVariant("");
    setIntakeNote("");
    setIntakeReferenceUrl("");
    setIntakeImage(null);
    setIntakeError(null);
    setIntakeSkipped(false);
                          setSelectedExtras([]);
                        }}
                        className="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-(--primary-color) checked:bg-(--primary-color) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary-color) disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden"
                        required
                      />
                      <label
                        htmlFor={`service-${s._id}`}
                        className="block text-sm/6 font-medium text-gray-900 dark:text-gray-100 flex-1"
                      >
                        {s.name}
                      </label>
                    </div>
                  ))}
                </div>

                {selectedService && (
                  <div className="mt-4 space-y-4">
                    {/* Prikaz varijanti ako usluga ima */}
                    {selectedService.type === "variant" &&
                      selectedService.variants &&
                      selectedService.variants.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Izaberite varijantu:
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {selectedService.variants.map((variant, index) => (
                              <label
                                key={index}
                                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                                  selectedVariant === variant.name
                                    ? "border-(--primary-color) bg-(--primary-color)/5"
                                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="variant"
                                  value={variant.name}
                                  checked={selectedVariant === variant.name}
                                  onChange={() =>
                                    handleVariantChange(variant.name)
                                  }
                                  className="mr-3"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 dark:text-gray-100">
                                    {variant.name}
                                  </div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {formatServicePrice(variant.price, variant.priceMode)}
                                    {variant.duration &&
                                      ` • ${variant.duration} min`}
                                  </div>
                                  {variant.perItem && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      (po stavci)
                                    </div>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Prikaz ekstra opcija */}
                    {selectedService.extras &&
                      selectedService.extras.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Dodatne opcije (opciono):
                          </label>
                          <div className="space-y-2">
                            {selectedService.extras.map((extra, index) => (
                              <label
                                key={index}
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
                                  +{formatServicePrice(extra.price || 0, extra.priceMode)}
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Prikaz ukupne cene i trajanja */}
                    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            Ukupno:
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {totalDuration} min
                          </div>
                          {selectedVariant && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              Izabrana varijanta: {selectedVariant}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-(--secondary-color)">
                            {totalPriceLabel || "—"}
                          </div>
                          {estimate?.unknown && (
                            <div className="text-[11px] text-gray-500 mt-0.5">
                              Konačna cena biće potvrđena naknadno.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {servicesLoading && (
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Učitavanje usluga...
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-4 mt-4">
              {/* Zahtev klijentkinje — prikazuje se samo kada je usluga tako
                  podešena (`bookingIntake.enabled`). Isti ugovor kao u javnom
                  widgetu; drugačiji UI jer je ovo panel, ne landing. */}
              {intakeEnabled && !intakeSkipped && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Kako želite da izgleda?
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Pošaljite fotografiju ili nam ukratko opišite šta želite.
                  </p>

                  <div className="mt-3">
                    {intakeImage ? (
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={intakeImage.url}
                          alt="Vaša referentna fotografija"
                          className="h-20 w-20 rounded-lg object-cover border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => setIntakeImage(null)}
                          className="text-xs text-gray-500 underline hover:text-red-600"
                        >
                          Ukloni fotografiju
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={intakeUploading}
                          onClick={() => intakeFileRef.current?.click()}
                          className="w-full rounded-md border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:border-(--secondary-color) disabled:opacity-60 transition"
                        >
                          {intakeUploading ? "Otpremanje…" : "Dodaj fotografiju"}
                        </button>
                        <p className="mt-1 text-[11px] text-gray-400">
                          JPG / PNG / WEBP · do 5 MB
                        </p>
                      </>
                    )}
                    <input
                      ref={intakeFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) uploadIntakeImage(file);
                      }}
                    />
                    {intakeError && (
                      <p className="mt-1 text-xs font-semibold text-red-600">
                        {intakeError}
                      </p>
                    )}
                  </div>

                  <input
                    type="url"
                    inputMode="url"
                    value={intakeReferenceUrl}
                    onChange={(e) => setIntakeReferenceUrl(e.target.value)}
                    placeholder="Link ka inspiraciji (https://...)"
                    className="mt-3 block w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-2 text-sm"
                  />
                  <textarea
                    rows={3}
                    value={intakeNote}
                    onChange={(e) => setIntakeNote(e.target.value)}
                    placeholder="Opišite dizajn, boju ili druge želje..."
                    className="mt-2 block w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-2 text-sm"
                  />

                  {!intakeImage && !intakeNote && !intakeReferenceUrl && (
                    <div className="mt-2 text-right">
                      <button
                        type="button"
                        onClick={() => setIntakeSkipped(true)}
                        className="text-xs text-gray-400 underline hover:text-gray-600"
                      >
                        Preskoči
                      </button>
                    </div>
                  )}
                </div>
              )}
              {intakeEnabled && intakeSkipped && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setIntakeSkipped(false)}
                    className="text-xs text-gray-400 underline hover:text-gray-600"
                  >
                    Ipak dodaj fotografiju ili opis
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Napomena (opciono)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 p-2"
                  rows={3}
                  placeholder="Dodatne napomene ili instrukcije..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="cursor-pointer px-4 py-2 bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 transition-colors"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  className="cursor-pointer px-4 py-2 bg-(--secondary-color) text-white rounded hover:bg-(--secondary-color)/80 transition-colors disabled:opacity-50"
                  disabled={
                    createAppointment.isPending ||
                    !user ||
                    manualSlotInvalid ||
                    (selectedService?.type === "variant" && !selectedVariant)
                  }
                >
                  {createAppointment.isPending
                    ? "Kreiranje..."
                    : "Kreiraj termin"}
                </button>
              </div>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
