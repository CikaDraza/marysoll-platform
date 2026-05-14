"use client";

import { useState, useMemo, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAppointmentMutations } from "@/hooks/useAppointmentMutations";
import { formatPriceToString, formatServicePrice } from "@/helpers/formatPrice";
import type { IService, IAppointment } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PendingAppointment = {
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

export const PENDING_STORAGE_KEY = "ms_pending_appointment";

// ─── Component ────────────────────────────────────────────────────────────────

export function BookingModal({
  isOpen,
  onClose,
  defaultDate,
  defaultTime,
  services,
  isLoggedIn,
  userName,
  userEmail,
  token,
  tenantSlug,
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
  tenantSlug?: string;
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
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestData, setGuestData] = useState({
    name: "",
    phone: "",
    email: "",
    instagram: "",
    tiktok: "",
  });
  const [guestLoading, setGuestLoading] = useState(false);

  useEffect(() => {
    setSelectedDate(defaultDate);
    setSelectedTime(defaultTime);
    if (pendingDefaults) {
      setSelectedServiceId(pendingDefaults.serviceId || services[0]?._id || "");
      setSelectedVariant(pendingDefaults.variantName || "");
      setSelectedExtras(pendingDefaults.extras || []);
      setNote(pendingDefaults.note || "");
    }
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
    setShowGuestForm(false);
    setGuestData({ name: "", phone: "", email: "", instagram: "", tiktok: "" });
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
      clientProfileId: user.tenantUserId ?? undefined,
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

  function doGuestReserve() {
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

  function handleGuestReserve(e: React.FormEvent) {
    e.preventDefault();
    doGuestReserve();
  }

  async function handleGuestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate || !selectedTime)
      return toast.error("Molimo izaberite datum i vreme.");
    if (!selectedService) return toast.error("Izabrana usluga nije pronađena.");
    if (selectedService.type === "variant" && !selectedVariant)
      return toast.error("Molimo izaberite varijantu usluge.");
    if (!guestData.name.trim()) return toast.error("Unesite ime i prezime.");
    if (!guestData.phone.trim()) return toast.error("Unesite broj telefona.");
    if (!tenantSlug)
      return toast.error("Greška: nedostaje identifikator salona.");

    const extrasForStorage = selectedExtras.map((extraName) => {
      const extra = selectedService.extras?.find((e) => e.name === extraName);
      return {
        name: extraName,
        price: extra?.price || 0,
        duration: extra?.duration || 0,
        perItem: extra?.perItem || false,
      };
    });

    const noteParts = [note || ""];
    if (guestData.instagram.trim())
      noteParts.push(`Instagram: @${guestData.instagram.trim()}`);
    if (guestData.tiktok.trim())
      noteParts.push(`TikTok: @${guestData.tiktok.trim()}`);
    const noteWithInstagram = noteParts.filter(Boolean).join("\n") || undefined;

    setGuestLoading(true);
    try {
      const res = await fetch(`/api/public/${tenantSlug}/appointments/guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: guestData.name.trim(),
          phone: guestData.phone.trim(),
          email: guestData.email.trim() || null,
          instagram: guestData.instagram.trim() || null,
          tiktok: guestData.tiktok.trim() || null,
          serviceId: selectedServiceId,
          serviceName: `${selectedService.name}${selectedVariant ? ` - ${selectedVariant}` : ""}`,
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
          date: selectedDate,
          time: selectedTime,
          duration: totalDuration,
          note: noteWithInstagram,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Greška");
      }

      toast.success("Zakazano — čeka odobrenje.");
      handleClose();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Greška pri zakazivanju.");
    } finally {
      setGuestLoading(false);
    }
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
                <p className="text-sm text-(--primary-color) font-medium mt-1">
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
            <div className="mb-4 p-3 bg-(--primary-color)/10 rounded-xl border border-(--primary-color)/10">
              <p className="text-xs text-(--primary-color) font-semibold">
                Zakazujete kao: {userName} ({userEmail})
              </p>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100 space-y-2">
              {!showGuestForm ? (
                <>
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-xs text-amber-700 font-semibold leading-relaxed">
                      Niste prijavljeni. Popunite formu i kliknite &quot;Postavi
                      za rezervaciju&quot; — bićete preusmereni na prijavu.
                      Nakon prijave vaš termin će biti potvrđen.
                    </p>
                    <button
                      type="button"
                      onClick={doGuestReserve}
                      className="shrink-0 text-xs font-bold text-amber-700 border border-amber-300 bg-white hover:bg-amber-50 px-2.5 py-1 rounded-lg transition"
                    >
                      Prijavi se →
                    </button>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-amber-100">
                    <span className="text-xs text-amber-600">
                      Ili zakažite termin kao gost
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowGuestForm(true)}
                      className="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition"
                    >
                      Nastavljam kao gost
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-amber-700 font-semibold">
                    Zakazujete kao gost — unesite podatke ispod
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowGuestForm(false)}
                    className="text-xs text-amber-600 hover:text-amber-800 underline"
                  >
                    ← Imam nalog
                  </button>
                </div>
              )}
            </div>
          )}

          <form
            onSubmit={
              isLoggedIn
                ? handleSubmitLoggedIn
                : showGuestForm
                  ? handleGuestSubmit
                  : handleGuestReserve
            }
            className="flex-1 flex flex-col gap-4"
          >
            {/* Guest contact form */}
            {!isLoggedIn && showGuestForm && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Vaši podaci
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Ime i prezime *
                    </label>
                    <input
                      type="text"
                      value={guestData.name}
                      onChange={(e) =>
                        setGuestData((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="Ana Jovanović"
                      required
                      className="block w-full rounded-xl border border-gray-200 bg-white text-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary-color)/80 placeholder:text-gray-400"
                    />
                  </div>
                  <div className="col-span-2 lg:col-span-1">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Telefon *
                    </label>
                    <input
                      type="tel"
                      value={guestData.phone}
                      onChange={(e) =>
                        setGuestData((p) => ({ ...p, phone: e.target.value }))
                      }
                      placeholder="+381 60 123 4567"
                      required
                      className="block w-full rounded-xl border border-gray-200 bg-white text-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary-color)/80 placeholder:text-gray-400"
                    />
                  </div>
                  <div className="col-span-2 lg:col-span-1">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Email (opciono)
                    </label>
                    <input
                      type="email"
                      value={guestData.email}
                      onChange={(e) =>
                        setGuestData((p) => ({ ...p, email: e.target.value }))
                      }
                      placeholder="ana@email.com"
                      className="block w-full rounded-xl border border-gray-200 bg-white text-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary-color)/80 placeholder:text-gray-400"
                    />
                  </div>
                  <div className="col-span-2 lg:col-span-1">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Instagram (opciono)
                    </label>
                    <div className="flex items-center rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-(--primary-color)/80">
                      <span className="px-2.5 text-sm text-gray-400 select-none">
                        @
                      </span>
                      <input
                        type="text"
                        value={guestData.instagram}
                        onChange={(e) =>
                          setGuestData((p) => ({
                            ...p,
                            instagram: e.target.value,
                          }))
                        }
                        placeholder="username"
                        className="flex-1 bg-transparent text-gray-800 py-2 pr-3 text-sm focus:outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                  <div className="col-span-2 lg:col-span-1">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      TikTok (opciono)
                    </label>
                    <div className="flex items-center rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-(--primary-color)/80">
                      <span className="px-2.5 text-sm text-gray-400 select-none">
                        @
                      </span>
                      <input
                        type="text"
                        value={guestData.tiktok}
                        onChange={(e) =>
                          setGuestData((p) => ({
                            ...p,
                            tiktok: e.target.value,
                          }))
                        }
                        placeholder="username"
                        className="flex-1 bg-transparent text-gray-800 py-2 pr-3 text-sm focus:outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                  className="block w-full rounded-xl border border-gray-200 bg-gray-50 text-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary-color)/80"
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
                  className="block w-full rounded-xl border border-gray-200 bg-gray-50 text-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary-color)/80"
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
                        ? "border-(--primary-color) bg-(--primary-color)/10"
                        : "border-gray-200 hover:border-(--primary-color)/20 bg-gray-50"
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
                          ? "border-(--primary-color) bg-(--primary-color)"
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
                              ? "border-(--primary-color) bg-(--primary-color)/10"
                              : "border-gray-200 hover:border-(--primary-color)/20 bg-gray-50"
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
                              {formatServicePrice(v.price, v.priceMode)}
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
                        className="flex items-center justify-between px-3 py-2 rounded-xl border border-gray-200 cursor-pointer hover:border-(--primary-color)/20 bg-gray-50"
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
                            className="rounded text-(--primary-color)"
                          />
                          <span className="text-sm text-gray-800">
                            {extra.name}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-(--primary-color)">
                          +{formatServicePrice(extra.price || 0, extra.priceMode)}
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
                  <div className="text-xl font-bold text-(--primary-color)">
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
                className="block w-full rounded-xl border border-gray-200 bg-gray-50 text-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary-color)/80 placeholder:text-gray-400"
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
                  className="px-5 py-2 text-sm font-semibold text-white bg-(--primary-color)/90 hover:bg-(--primary-color) rounded-xl transition disabled:opacity-50 cursor-pointer"
                >
                  {createAppointment.isPending
                    ? "Zakazivanje..."
                    : "Zakaži termin"}
                </button>
              ) : showGuestForm ? (
                <button
                  type="submit"
                  disabled={
                    guestLoading ||
                    (selectedService?.type === "variant" && !selectedVariant)
                  }
                  className="px-5 py-2 text-sm font-semibold text-white bg-(--primary-color)/90 hover:bg-(--primary-color) rounded-xl transition disabled:opacity-50 cursor-pointer"
                >
                  {guestLoading ? "Zakazivanje..." : "Zakaži kao gost"}
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
