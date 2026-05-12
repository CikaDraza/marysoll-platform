"use client";

import { MapPinIcon } from "@heroicons/react/24/outline";
import { useSuperAdminSalonGeoLocation } from "@/hooks/useSuperAdminSalonGeoLocation";

type Props = {
  tenantId: string;
};

const inputClass =
  "w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-400 font-mono";

const labelClass =
  "block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5";

export function SuperAdminSalonGeoLocationPanel({ tenantId }: Props) {
  const geo = useSuperAdminSalonGeoLocation(tenantId);

  if (geo.isLoading) {
    return (
      <div className="sm:col-span-2 rounded-lg border border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400">
        Učitavanje adrese salona...
      </div>
    );
  }

  if (geo.isError) {
    return (
      <div className="sm:col-span-2 rounded-lg border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300">
        {geo.errorMessage}
      </div>
    );
  }

  const street = geo.salon?.street.trim() || "Adresa nije uneta";
  const city = geo.salon?.city.trim() || "Grad nije unet";
  const hasCoordinates =
    typeof geo.salon?.lat === "number" && typeof geo.salon.lng === "number";
  const mapsHref = hasCoordinates
    ? `https://www.google.com/maps?q=${geo.salon?.lat},${geo.salon?.lng}`
    : null;

  return (
    <div className="sm:col-span-2 rounded-lg border border-slate-700 bg-slate-900/40 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-950/60 text-violet-300">
          <MapPinIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Geo lokacija za Google Maps
          </p>
          <p className="mt-1 text-sm font-semibold text-white">{street}</p>
          <p className="text-sm text-slate-300">{city}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Latitude</label>
          <input
            className={inputClass}
            inputMode="decimal"
            value={geo.latInput}
            onChange={(e) => geo.setLatInput(e.target.value)}
            placeholder="44.786568"
          />
        </div>
        <div>
          <label className={labelClass}>Longitude</label>
          <input
            className={inputClass}
            inputMode="decimal"
            value={geo.lngInput}
            onChange={(e) => geo.setLngInput(e.target.value)}
            placeholder="20.448921"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {mapsHref ? (
          <a
            href={mapsHref}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-violet-300 hover:text-violet-200"
          >
            Otvori u Google Maps
          </a>
        ) : (
          <span className="text-xs text-slate-500">
            Unesite obe koordinate za Google Maps link.
          </span>
        )}
        <button
          type="button"
          onClick={geo.saveGeoLocation}
          disabled={geo.isSaving}
          className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-500 disabled:opacity-40"
        >
          {geo.isSaving ? "Čuvam..." : "Sačuvaj geo lokaciju"}
        </button>
      </div>
    </div>
  );
}
