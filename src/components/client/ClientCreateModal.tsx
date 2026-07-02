import { formatPriceToString, formatServicePrice } from "@/helpers/formatPrice";
import { generateTimes } from "@/helpers/generateTimes";
import {
  manualTimesForDate,
  isManualSlotTaken,
  timeToMin,
} from "@/helpers/manualSlots";
import { useAppointmentMutations } from "@/hooks/useAppointmentMutations";
import { useAuth } from "@/hooks/useAuth";
import { useServices } from "@/hooks/useServices";
import { IAppointment, ManualSlotsMap } from "@/types";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  defaultTime?: string;
  token?: string;
  /** "manualSlots" ograničava izbor na termine koje je vlasnik definisao. */
  availabilityMode?: string;
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
  manualSlots,
  bookedAppointments,
}: Props) {
  const { user, isLoading } = useAuth();
  const { data: services = [], isLoading: servicesLoading } = useServices();
  const { createAppointment } = useAppointmentMutations(token);

  const timeOptions = useMemo(() => generateTimes(0, 24, 15), []);

  const [selectedDate, setSelectedDate] = useState<string>(defaultDate ?? "");
  const [selectedTime, setSelectedTime] = useState<string>(defaultTime ?? "");
  const [selectedServiceId, setSelectedServiceId] = useState(
    servicesLoading ? "" : services[0]?._id,
  );
  const [selectedVariant, setSelectedVariant] = useState<string>(""); // Promenjeno u string
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [note, setNote] = useState("");

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

  // Izračunavanje ukupne cene i trajanja
  const calculateTotal = () => {
    if (!selectedService) return { price: 0, duration: 0 };

    let price = 0;
    let duration = selectedService.duration || 0;

    // Za varijante
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
    }
    // Za single usluge
    else if (selectedService.type === "single") {
      price = selectedService.basePrice || 0;
      duration = selectedService.duration || 0;
    }
    // Za grupne usluge
    else if (selectedService.type === "group" && selectedService.services) {
      // Ovde možete dodati logiku za grupe ako je potrebno
      price = selectedService.basePrice || 0;
      duration = selectedService.duration || 0;
    }

    // Dodavanje extra usluga
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
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Datum *
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    if (isManualMode) setSelectedTime("");
                  }}
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
                  value={isManualMode && manualSlotInvalid ? "" : selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-2"
                  required
                >
                  <option value="">
                    {isManualMode ? "— izaberite termin —" : "— izaberite vreme —"}
                  </option>
                  {isManualMode
                    ? availableManualTimes.map((s) => (
                        <option key={s.time} value={s.time}>
                          {s.time} ({s.duration} min)
                        </option>
                      ))
                    : timeOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                </select>
                {isManualMode &&
                  selectedDate &&
                  availableManualTimes.length === 0 && (
                    <p className="mt-1 text-xs font-semibold text-red-500">
                      Nema slobodnih termina za izabrani datum.
                    </p>
                  )}
              </div>

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
                        <div className="text-xl font-bold text-(--secondary-color)">
                          {formatPriceToString(totalPrice)} RSD
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
