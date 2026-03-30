// components/admin/AdminCreateModal.tsx
"use client";

import React, { useMemo, useState } from "react";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useAppointmentMutations } from "@/hooks/useAppointmentMutations";
import { useUsers } from "@/hooks/useUsers";
import { generateTimes } from "@/helpers/generateTimes";
import { IAppointment, IUser } from "@/types";
import { useServices } from "@/hooks/useServices";
import { formatPriceToString } from "@/helpers/formatPrice";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  defaultTime?: string;
  token?: string;
}

const inp = [
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm",
  "text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800",
  "focus:outline-none focus:ring-2 focus:ring-violet-400 transition",
  "placeholder:text-gray-400 dark:placeholder:text-gray-500",
].join(" ");

const lbl =
  "block text-[11px] font-bold text-gray-400 dark:text-gray-300 uppercase tracking-widest mb-1.5";
const card =
  "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6";

// Tip za payload pri kreiranju (bez _id i automatskih polja)
type CreateAppointmentPayload = Omit<
  IAppointment,
  "_id" | "createdAt" | "updatedAt"
> & {
  status?: IAppointment["status"];
  messages?: IAppointment["messages"];
  adminNotified?: boolean;
  clientNotified?: boolean;
  lastUpdatedBy?: IAppointment["lastUpdatedBy"];
};

export default function AdminCreateModal({
  isOpen,
  onClose,
  defaultDate,
  defaultTime,
  token,
}: Props) {
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { data: services = [], isLoading: servicesLoading } = useServices();
  const { createAppointment } = useAppointmentMutations(token || "");
  const timeOptions = useMemo(() => generateTimes(0, 24, 15), []);

  const [clientId, setClientId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(defaultDate ?? "");
  const [selectedTime, setSelectedTime] = useState<string>(defaultTime ?? "");
  const [selectedServiceId, setSelectedServiceId] = useState(
    servicesLoading ? "" : services[0]?._id,
  );
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const selectedService = services.find((s) => s._id === selectedServiceId);
  const selectedClient = users.find((u) => u._id === clientId);

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

  const handleSubmit = async (e?: React.SubmitEvent) => {
    e?.preventDefault();
    if (!clientId) return toast.error("Izaberite klijenta.");
    if (!selectedDate || !selectedTime)
      return toast.error("Datum i vreme su obavezni.");
    if (!selectedService) return toast.error("Izaberite uslugu.");

    const client = users.find((u) => u._id === clientId) as IUser | undefined;
    if (!client) return toast.error("Izabrani klijent nije pronađen.");

    // Provera za varijante
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
    const payload: CreateAppointmentPayload = {
      clientId: client._id ?? "",
      clientName: client.name,
      clientEmail: client.email,
      serviceName: `${selectedService.name}${
        selectedVariant ? ` - ${selectedVariant}` : ""
      }`,
      duration: totalDuration,
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
      note: note || undefined,
      status: "pending",
      messages: [],
      adminNotified: false,
      clientNotified: true,
      lastUpdatedBy: "admin",
    };

    try {
      await createAppointment.mutateAsync(payload);
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error("Greška pri kreiranju termina.");
    }
  };

  const handleClose = () => {
    setClientId(null);
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

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/80" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          className={
            card +
            " max-w-xl w-full max-h-[90vh] min-h-[90vh] overflow-scroll lg:min-h-auto"
          }
        >
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Kreiraj termin</h3>
            <button
              onClick={handleClose}
              className="text-gray-600 hover:text-gray-900 dark:hover:text-gray-200"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Prikaz informacija o klijentu */}
          {selectedClient && (
            <div className="mt-4 p-3 bg-gray-100 rounded-lg">
              <p className="text-sm font-medium text-gray-900">Klijent:</p>
              <p className="text-sm text-gray-600">{selectedClient.name}</p>
              <p className="text-sm text-gray-600">{selectedClient.email}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className={lbl}>Klijent *</label>
              <select
                value={clientId ?? ""}
                onChange={(e) => setClientId(e.target.value || null)}
                className={inp}
                required
              >
                <option value="">— izaberite klijenta —</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} — {u.email}
                  </option>
                ))}
              </select>
              {usersLoading && (
                <p className="text-xs text-gray-500 mt-1">
                  Učitavanje korisnika...
                </p>
              )}
            </div>

            <div>
              <label className={lbl}>Datum *</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={inp}
                required
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div>
              <label className={lbl}>Vreme *</label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className={inp}
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

            <div>
              <label className={lbl}>Usluga *</label>
              <div className="flex flex-col lg:grid lg:grid-cols-2 mt-3 gap-2">
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
                                onChange={(e) =>
                                  setSelectedVariant(e.target.value)
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
                                  checked={selectedExtras.includes(extra.name)}
                                  onChange={() => handleExtraToggle(extra.name)}
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
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold">Ukupno:</div>
                        <div className="text-sm text-gray-600">
                          {totalDuration} min
                        </div>
                        {selectedVariant && (
                          <div className="text-xs text-gray-500 mt-1">
                            Varijanta: {selectedVariant}
                          </div>
                        )}
                      </div>
                      <div className="text-lg font-bold text-(--secondary-color)">
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

            <div>
              <label className={lbl}>Napomena (opciono)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={inp}
                rows={3}
                placeholder="Dodatne napomene ili instrukcije za klijenta..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="cursor-pointer px-4 py-2 bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-800/80 rounded hover:bg-gray-200 transition-colors"
              >
                Otkaži
              </button>
              <button
                type="submit"
                className="cursor-pointer px-4 py-2 bg-(--secondary-color) text-white rounded hover:bg-(--secondary-color)/80 transition-colors disabled:opacity-50"
                disabled={
                  createAppointment.isPending ||
                  !clientId ||
                  (selectedService?.type === "variant" && !selectedVariant)
                }
              >
                {createAppointment.isPending
                  ? "Kreiranje..."
                  : "Kreiraj termin"}
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
