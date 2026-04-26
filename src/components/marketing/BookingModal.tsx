"use client";
// src/components/marketing/BookingModal.tsx

import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import toast from "react-hot-toast";
import type { MappedSlot } from "@/lib/mappers/salonMapper";

interface Props {
  slot: MappedSlot | null;
  salonName: string;
  onClose: () => void;
}

export function BookingModal({ slot, salonName, onClose }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  if (!slot) return null;

  const time = new Date(slot.startTime).toLocaleTimeString("sr-Latn-RS", {
    hour: "2-digit",
    minute: "2-digit",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Unesite ime i telefon");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonId: slot!.salonId,
          serviceId: slot!.serviceId ?? "",
          startTime: slot!.startTime,
          user: { name, phone },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Greška");
      }
      toast.success("Termin uspešno zakazan!");
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Greška pri zakazivanju");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={!!slot} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/40" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{salonName}</h2>
              <p className="text-sm text-gray-500">Termin u {time}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ime i prezime</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Ana Petrović"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="+381 60 123 4567"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-2.5 rounded-xl font-semibold hover:bg-purple-700 transition disabled:opacity-60"
            >
              {loading ? "Zakazujem..." : "Zakaži termin"}
            </button>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
