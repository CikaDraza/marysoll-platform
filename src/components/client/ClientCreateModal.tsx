import { formatPriceToString } from "@/helpers/formatPrice";
import { generateTimes } from "@/helpers/generateTimes";
import { useAppointmentMutations } from "@/hooks/useAppointmentMutations";
import { useAuth } from "@/hooks/useAuth";
import { useServices } from "@/hooks/useServices";
import { IAppointment } from "@/types";
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
}

export default function ClientCreateModal({
  isOpen,
  onClose,
  defaultDate,
  defaultTime,
  token,
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
      clientId: user._id,
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
      toast.error("Greška pri kreiranju termina.");
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
          <DialogPanel className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-6">
            <div className="text-center py-8">
              <p>Učitavanje...</p>
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
        <DialogPanel className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-6 max-h-[90vh] min-h-[90vh] overflow-y-auto flex flex-col">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Zakazivanje termina</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900">
              Zakazujete termin kao:
            </p>
            <p className="text-sm text-gray-600">{user?.name}</p>
            <p className="text-sm text-gray-600">{user?.email}</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex-1 flex flex-col justify-between my-6"
          >
            <div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Datum *
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-200 bg-gray-100 p-2 focus:outline-2 focus:-outline-offset-2 focus:outline-(--secondary-color)"
                  required
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700">
                  Vreme *
                </label>
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-200 bg-gray-100 p-2"
                  required
                >
                  <option value="">— izaberite vreme —</option>
                  {timeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700">
                  Usluga *
                </label>
                <div className="flex flex-col lg:grid lg:grid-cols-2 mt-3 gap-x-3 gap-y-2">
                  {services.map((s) => (
                    <div
                      key={s._id}
                      className="flex gap-x-3 items-center rounded-md border-gray-200 bg-gray-100 p-2"
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
                        className="block text-sm/6 font-medium text-gray-900 flex-1"
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
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Izaberite varijantu:
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {selectedService.variants.map((variant, index) => (
                              <label
                                key={index}
                                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                                  selectedVariant === variant.name
                                    ? "border-(--primary-color) bg-(--primary-color)/5"
                                    : "border-gray-200 hover:border-gray-300"
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
                                  <div className="font-medium">
                                    {variant.name}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {formatPriceToString(variant.price)} RSD
                                    {variant.duration &&
                                      ` • ${variant.duration} min`}
                                  </div>
                                  {variant.perItem && (
                                    <div className="text-xs text-gray-500 mt-1">
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
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Dodatne opcije (opciono):
                          </label>
                          <div className="space-y-2">
                            {selectedService.extras.map((extra, index) => (
                              <label
                                key={index}
                                className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:border-gray-300"
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
                                    <div className="font-medium">
                                      {extra.name}
                                    </div>
                                    {extra.perItem && (
                                      <div className="text-xs text-gray-500">
                                        (po stavci)
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-(--secondary-color) font-semibold">
                                  +{formatPriceToString(extra.price || 0)} RSD
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Prikaz ukupne cene i trajanja */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold">Ukupno:</div>
                          <div className="text-sm text-gray-600">
                            {totalDuration} min
                          </div>
                          {selectedVariant && (
                            <div className="text-sm text-gray-500 mt-1">
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
                  <span className="text-sm font-semibold text-gray-700">
                    Učitavanje usluga...
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Napomena (opciono)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-200 bg-gray-100 p-2"
                  rows={3}
                  placeholder="Dodatne napomene ili instrukcije..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="cursor-pointer px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  className="cursor-pointer px-4 py-2 bg-(--secondary-color) text-white rounded hover:bg-(--secondary-color)/80 transition-colors disabled:opacity-50"
                  disabled={
                    createAppointment.isPending ||
                    !user ||
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
