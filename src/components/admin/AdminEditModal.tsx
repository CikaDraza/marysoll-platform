"use client";

import React, { useMemo, useState } from "react";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { XMarkIcon, TrashIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { generateTimes } from "@/helpers/generateTimes";
import { IAppointment } from "@/types";
import { useAppointmentMutations } from "@/hooks/useAppointmentMutations";
import { useServices } from "@/hooks/useServices";
import { formatPriceToString } from "@/helpers/formatPrice";
import { motion } from "framer-motion";
import AlertModal from "../modals/AlertModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  appointment: IAppointment | null;
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

export default function AdminEditModal({
  isOpen,
  onClose,
  appointment,
  token,
}: Props) {
  const { updateAppointment, deleteAppointment } =
    useAppointmentMutations(token);
  const { data: services = [], isLoading: servicesLoading } = useServices();
  const timeOptions = useMemo(() => generateTimes(0, 24, 15), []);

  // Izvlačenje podataka iz appointment-a direktno
  const appointmentService = appointment?.services?.[0];

  const [selectedEditDate, setSelectedEditDate] = useState<string>(
    appointment?.date ?? "",
  );
  const [selectedEditTime, setSelectedEditTime] = useState<string>(
    appointment?.time ?? "",
  );
  const [selectedServiceId, setSelectedServiceId] = useState(
    appointmentService?.serviceId || services[0]?._id || "",
  );
  const [selectedVariant, setSelectedVariant] = useState<string>(
    appointmentService?.serviceName || "",
  );
  const [selectedExtras, setSelectedExtras] = useState<string[]>(
    appointmentService?.extras?.map((e) => e.name) || [],
  );
  const [note, setNote] = useState<string>(appointment?.note || "");
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  if (!appointment) return null;

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

  const handleUpdate = async (e?: React.SubmitEvent) => {
    e?.preventDefault();

    if (!selectedService) {
      return toast.error("Molimo izaberite uslugu.");
    }

    // Provera za varijante
    if (selectedService.type === "variant" && !selectedVariant) {
      return toast.error("Molimo izaberite varijantu usluge.");
    }

    try {
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

      const updateData: Partial<IAppointment> = {
        date: selectedEditDate,
        time: selectedEditTime,
        serviceName: `${selectedService.name}${
          selectedVariant ? ` - ${selectedVariant}` : ""
        }`,
        note: note || undefined,
        duration: totalDuration,
        services: [
          {
            serviceId: selectedServiceId,
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
        lastUpdatedBy: "admin",
      };

      await updateAppointment.mutateAsync({
        id: appointment._id!,
        updatedData: updateData,
      });
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Greška pri ažuriranju termina.");
    }
  };

  const confirmDelete = () => {
    setIsAlertOpen(true);
  };

  const handleDelete = async () => {
    try {
      await deleteAppointment.mutateAsync(appointment._id!);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Greška pri brisanju termina.");
    }
  };

  const handleExtraToggle = (extraName: string) => {
    setSelectedExtras((prev) =>
      prev.includes(extraName)
        ? prev.filter((name) => name !== extraName)
        : [...prev, extraName],
    );
  };

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="relative my-20 z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/80" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="max-w-xl w-full bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 overflow-scroll max-h-[90vh] min-h-[90vh] lg:min-h-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Izmene termina</h3>
              <button
                onClick={onClose}
                className="cursor-pointer text-gray-600 hover:text-gray-900 dark:hover:text-gray-50"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="mt-4 space-y-4 h-full">
              <div>
                <label className={lbl}>Datum</label>
                <input
                  type="date"
                  value={selectedEditDate}
                  onChange={(e) => setSelectedEditDate(e.target.value)}
                  className={inp}
                  required
                />
              </div>

              <div>
                <label className={lbl}>Vreme</label>
                <select
                  value={selectedEditTime}
                  onChange={(e) => setSelectedEditTime(e.target.value)}
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

              <div className="flex gap-x-3">
                <div className="flex-1">
                  <label className={lbl}>Klijent</label>
                  <input
                    type="text"
                    value={appointment.clientName}
                    disabled
                    className={inp}
                  />
                </div>

                <div className="flex-1">
                  <label className={lbl}>Email</label>
                  <input
                    type="email"
                    value={appointment.clientEmail}
                    disabled
                    className={inp}
                  />
                </div>
              </div>

              <div>
                <label className={lbl}>Usluga</label>
                <div className="flex flex-col lg:grid lg:grid-cols-2 mt-3 gap-x-3 gap-y-2">
                  {services.map((s) => (
                    <div
                      key={s._id}
                      className="flex flex-1 gap-x-3 items-center rounded-md border-gray-200 bg-gray-100 p-2"
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
                      />
                      <label
                        htmlFor={`service-${s._id}`}
                        className="block text-sm/6 font-medium text-gray-900"
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
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="mt-4 space-y-4"
                  >
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
                  </motion.div>
                )}

                <span className="text-sm font-semibold text-gray-700">
                  {servicesLoading && "Učitavanje usluga..."}
                </span>
              </div>

              <div>
                <label className={lbl}>Napomena</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className={inp}
                />
              </div>

              <div className="flex flex-col lg:flex-row justify-between items-center">
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded bg-red-100 text-red-600 hover:bg-red-600 hover:text-white"
                >
                  <TrashIcon className="w-4 h-4" /> Obriši termin
                </button>

                <div className="flex flex-col justify-end lg:flex-row mt-8 lg:mt-0 gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="cursor-pointer px-4 py-2 bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-800/80 rounded"
                  >
                    Otkaži
                  </button>
                  <button
                    type="submit"
                    className="cursor-pointer px-4 py-2 bg-(--secondary-color) hover:bg-(--secondary-color)/90 text-white rounded disabled:opacity-50"
                    disabled={
                      selectedService?.type === "variant" && !selectedVariant
                    }
                  >
                    Sačuvaj izmene
                  </button>
                </div>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
      <AlertModal
        open={isAlertOpen}
        setOpen={setIsAlertOpen}
        onConfirm={handleDelete}
        title="Obriši termin"
        message="Da li ste sigurni da želite da obrišete ovaj termin? Ova akcija se ne može opozvati."
      />
    </>
  );
}
