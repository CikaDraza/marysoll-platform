"use client";
// src/components/marketing/SalonShowcase.tsx
// Client component — hydrated with server-fetched data, handles booking modal

import { useState } from "react";
import { BookingModal } from "./BookingModal";
import type { HomeSalonEntry } from "@/lib/api/loadHomeSalons";
import type { MappedSlot } from "@/lib/mappers/salonMapper";

interface Props {
  entries: HomeSalonEntry[];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("sr-Latn-RS", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(price?: number): string {
  if (price == null) return "";
  return new Intl.NumberFormat("sr-Latn-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(price);
}

export function SalonShowcase({ entries }: Props) {
  const [activeSlot, setActiveSlot] = useState<MappedSlot | null>(null);
  const [activeSalonName, setActiveSalonName] = useState("");

  function openBooking(slot: MappedSlot, salonName: string) {
    setActiveSlot(slot);
    setActiveSalonName(salonName);
  }

  if (entries.length === 0) return null;

  return (
    <section className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
          Pronađi termin danas
        </h2>
        <p className="text-center text-gray-500 mb-12 text-sm">
          Dostupni termini za danas — klikni i zakaži
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {entries.map(({ salon, services, slots }) => (
            <div
              key={salon.id}
              className="border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition"
            >
              {/* Salon header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{salon.name}</h3>
                  {salon.location.city && (
                    <p className="text-sm text-gray-500">{salon.location.city}</p>
                  )}
                </div>
                {salon.distance != null && (
                  <span className="text-xs font-medium bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                    {salon.distance} km
                  </span>
                )}
              </div>

              {/* Services */}
              {services.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Usluge
                  </p>
                  <ul className="space-y-1">
                    {services.map((svc) => (
                      <li key={svc.id} className="flex justify-between text-sm">
                        <span className="text-gray-700">{svc.name}</span>
                        <span className="text-gray-400">
                          {svc.duration ? `${svc.duration} min` : ""}
                          {svc.price ? ` · ${formatPrice(svc.price)}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Slots */}
              {slots.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Slobodni termini
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => openBooking(slot, salon.name)}
                        className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition font-medium"
                      >
                        {formatTime(slot.startTime)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 mt-2">Nema slobodnih termina danas</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <BookingModal
        slot={activeSlot}
        salonName={activeSalonName}
        onClose={() => setActiveSlot(null)}
      />
    </section>
  );
}
