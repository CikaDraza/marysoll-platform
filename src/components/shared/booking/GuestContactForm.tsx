"use client";
/** GuestContactForm — Forma sa podacima gosta (ime, telefon, email, IG, TikTok).
 *  Stanje čita iz BookingProvider konteksta — bez prop drilling-a. */

import { useBookingContext } from "./BookingProvider";

export function GuestContactForm() {
  const {
    isLoggedIn,
    showGuestForm,
    guestData,
    setGuestData,
  } = useBookingContext();

  return (
    <>
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
            Telefon
          </label>
          <input
            type="tel"
            value={guestData.phone}
            onChange={(e) =>
              setGuestData((p) => ({ ...p, phone: e.target.value }))
            }
            placeholder="+381 60 123 4567"
            className="block w-full rounded-xl border border-gray-200 bg-white text-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary-color)/80 placeholder:text-gray-400"
          />
        </div>
        <div className="col-span-2 lg:col-span-1">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Email
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
            Instagram
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
        <p className="col-span-2 text-xs text-gray-500">
          Unesite bar jedan kontakt: telefon, email ili Instagram.
        </p>
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
    </>
  );
}
