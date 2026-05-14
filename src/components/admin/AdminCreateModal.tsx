// components/admin/AdminCreateModal.tsx
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { XMarkIcon, UserIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useAppointmentMutations } from "@/hooks/useAppointmentMutations";
import { useUsers } from "@/hooks/useUsers";
import { generateTimes } from "@/helpers/generateTimes";
import { IAppointment, IUser } from "@/types";
import { useServices } from "@/hooks/useServices";
import { formatPriceToString, formatServicePrice } from "@/helpers/formatPrice";
import { useQueryClient } from "@tanstack/react-query";

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
  const { data: services = [], isLoading: servicesLoading } = useServices({
    token: token ?? undefined,
  });
  const { createAppointment } = useAppointmentMutations(token || "");
  const queryClient = useQueryClient();
  const timeOptions = useMemo(() => generateTimes(0, 24, 15), []);

  // Client mode: existing user from list or new guest
  const [clientMode, setClientMode] = useState<"existing" | "guest">("existing");
  const [clientId, setClientId] = useState<string | null>(null);
  const [guestForm, setGuestForm] = useState({
    name: "",
    phone: "",
    email: "",
    instagram: "",
    tiktok: "",
  });
  const [guestLoading, setGuestLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>(defaultDate ?? "");
  const [selectedTime, setSelectedTime] = useState<string>(defaultTime ?? "");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSelectedDate(defaultDate ?? "");
      setSelectedTime(defaultTime ?? "");
    }
  }, [isOpen, defaultDate, defaultTime]);

  useEffect(() => {
    if (!servicesLoading && services.length > 0 && !selectedServiceId) {
      setSelectedServiceId(services[0]._id);
    }
  }, [servicesLoading, services, selectedServiceId]);

  const selectedService = services.find((s) => s._id === selectedServiceId);
  const selectedClient = users.find((u) => u._id === clientId);

  const calculateTotal = () => {
    if (!selectedService) return { price: 0, duration: 0 };

    let price = 0;
    let duration = selectedService.duration || 0;

    if (selectedService.type === "variant" && selectedVariant && selectedService.variants) {
      const variant = selectedService.variants.find((v) => v.name === selectedVariant);
      if (variant) {
        price = variant.price;
        if (variant.duration) duration = variant.duration;
      }
    } else if (selectedService.type === "single") {
      price = selectedService.basePrice || 0;
      duration = selectedService.duration || 0;
    } else if (selectedService.type === "group" && selectedService.services) {
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

  const handleSubmitExisting = async () => {
    if (!clientId) return toast.error("Izaberite klijenta.");
    if (!selectedDate || !selectedTime) return toast.error("Datum i vreme su obavezni.");
    if (!selectedService) return toast.error("Izaberite uslugu.");

    const client = users.find((u) => u._id === clientId) as IUser | undefined;
    if (!client) return toast.error("Izabrani klijent nije pronađen.");

    if (selectedService.type === "variant" && !selectedVariant) {
      return toast.error("Molimo izaberite varijantu usluge.");
    }

    const extrasForStorage = selectedExtras.map((extraName) => {
      const extra = selectedService.extras?.find((e) => e.name === extraName);
      return {
        name: extraName,
        price: extra?.price || 0,
        duration: extra?.duration || 0,
        perItem: extra?.perItem || false,
      };
    });

    const payload: CreateAppointmentPayload = {
      clientProfileId: client._id ?? "",
      clientName: client.name,
      clientEmail: client.email,
      serviceName: `${selectedService.name}${selectedVariant ? ` - ${selectedVariant}` : ""}`,
      duration: totalDuration,
      services: [
        {
          serviceId: selectedServiceId || "",
          serviceName: selectedService.type === "variant" ? selectedVariant : selectedService.name,
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

    await createAppointment.mutateAsync(payload);
    handleClose();
  };

  const handleSubmitGuest = async () => {
    if (!guestForm.name.trim()) return toast.error("Unesite ime i prezime.");
    if (!guestForm.phone.trim()) return toast.error("Unesite broj telefona.");
    if (!selectedDate || !selectedTime) return toast.error("Datum i vreme su obavezni.");
    if (!selectedService) return toast.error("Izaberite uslugu.");

    if (selectedService.type === "variant" && !selectedVariant) {
      return toast.error("Molimo izaberite varijantu usluge.");
    }

    const extrasForStorage = selectedExtras.map((extraName) => {
      const extra = selectedService.extras?.find((e) => e.name === extraName);
      return {
        name: extraName,
        price: extra?.price || 0,
        duration: extra?.duration || 0,
        perItem: extra?.perItem || false,
      };
    });

    setGuestLoading(true);
    try {
      const res = await fetch("/api/appointments/create-guest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: guestForm.name.trim(),
          phone: guestForm.phone.trim(),
          email: guestForm.email.trim() || null,
          instagram: guestForm.instagram.trim() || null,
          tiktok: guestForm.tiktok.trim() || null,
          serviceId: selectedServiceId,
          serviceName: `${selectedService.name}${selectedVariant ? ` - ${selectedVariant}` : ""}`,
          services: [
            {
              serviceId: selectedServiceId || "",
              serviceName: selectedService.type === "variant" ? selectedVariant : selectedService.name,
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
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Greška pri kreiranju termina.");

      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Termin uspešno zakazan.");
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška pri kreiranju termina.");
    } finally {
      setGuestLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (clientMode === "existing") {
        await handleSubmitExisting();
      } else {
        await handleSubmitGuest();
      }
    } catch {
      toast.error("Greška pri kreiranju termina.");
    }
  };

  const handleClose = () => {
    setClientMode("existing");
    setClientId(null);
    setGuestForm({ name: "", phone: "", email: "", instagram: "", tiktok: "" });
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

  const isPending = createAppointment.isPending || guestLoading;

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

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">

            {/* ── Klijent / Gost toggle ─────────────────────────────── */}
            <div>
              <label className={lbl}>Klijent *</label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setClientMode("existing")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                    clientMode === "existing"
                      ? "bg-violet-600 border-violet-600 text-white"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  Postojeći klijent
                </button>
                <button
                  type="button"
                  onClick={() => setClientMode("guest")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                    clientMode === "guest"
                      ? "bg-violet-600 border-violet-600 text-white"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                  }`}
                >
                  <UserPlusIcon className="w-3.5 h-3.5" />
                  Gost
                </button>
              </div>

              {/* Existing client dropdown */}
              {clientMode === "existing" && (
                <>
                  <select
                    value={clientId ?? ""}
                    onChange={(e) => setClientId(e.target.value || null)}
                    className={inp}
                  >
                    <option value="">— izaberite klijenta —</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} — {u.email}
                      </option>
                    ))}
                  </select>
                  {usersLoading && (
                    <p className="text-xs text-gray-500 mt-1">Učitavanje korisnika...</p>
                  )}
                  {selectedClient && (
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {selectedClient.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedClient.email}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Guest form fields */}
              {clientMode === "guest" && (
                <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div>
                    <label className={lbl}>Ime i prezime *</label>
                    <input
                      type="text"
                      value={guestForm.name}
                      onChange={(e) => setGuestForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Marija Marković"
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className={lbl}>Telefon *</label>
                    <input
                      type="tel"
                      value={guestForm.phone}
                      onChange={(e) => setGuestForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+381 60 123 4567"
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className={lbl}>Email (opciono)</label>
                    <input
                      type="email"
                      value={guestForm.email}
                      onChange={(e) => setGuestForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="email@primer.com"
                      className={inp}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Instagram (opciono)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                        <input
                          type="text"
                          value={guestForm.instagram}
                          onChange={(e) => setGuestForm((f) => ({ ...f, instagram: e.target.value }))}
                          placeholder="korisnicko.ime"
                          className={inp + " pl-7"}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={lbl}>TikTok (opciono)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                        <input
                          type="text"
                          value={guestForm.tiktok}
                          onChange={(e) => setGuestForm((f) => ({ ...f, tiktok: e.target.value }))}
                          placeholder="korisnicko.ime"
                          className={inp + " pl-7"}
                        />
                      </div>
                    </div>
                  </div>
                </div>
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
                                onChange={(e) => setSelectedVariant(e.target.value)}
                                className="mr-3"
                              />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  {variant.name}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {formatServicePrice(variant.price, variant.priceMode)}
                                  {variant.duration && ` • ${variant.duration} min`}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                  {selectedService.extras && selectedService.extras.length > 0 && (
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
                                checked={selectedExtras.includes(extra.name)}
                                onChange={() => handleExtraToggle(extra.name)}
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
                </div>
              )}

              {servicesLoading && (
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
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
                  isPending ||
                  (clientMode === "existing" && !clientId) ||
                  (clientMode === "guest" && (!guestForm.name.trim() || !guestForm.phone.trim())) ||
                  (selectedService?.type === "variant" && !selectedVariant)
                }
              >
                {isPending ? "Kreiranje..." : "Kreiraj termin"}
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
