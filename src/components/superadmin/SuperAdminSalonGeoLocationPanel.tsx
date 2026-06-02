"use client";

import { MapPinIcon, GlobeAltIcon } from "@heroicons/react/24/outline";
import { useSuperAdminSalonGeoLocation } from "@/hooks/useSuperAdminSalonGeoLocation";
import { useSuperAdminSalonMarketplace } from "@/hooks/useSuperAdminSalonMarketplace";

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

      <MarketplaceControls tenantId={tenantId} />
    </div>
  );
}

function MarketplaceControls({ tenantId }: { tenantId: string }) {
  const mk = useSuperAdminSalonMarketplace(tenantId);

  return (
    <div className="border-t border-slate-700 pt-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-950/60 text-emerald-300">
          <GlobeAltIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Marketplace (booking.marysoll.com)
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {mk.marketplaceEnabled
              ? "Salon je vidljiv u marketplace-u."
              : "Salon NIJE vidljiv u marketplace-u."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={mk.marketplaceEnabled}
          onClick={mk.toggleEnabled}
          disabled={mk.isSaving || mk.isLoading}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-40 ${
            mk.marketplaceEnabled ? "bg-emerald-600" : "bg-slate-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
              mk.marketplaceEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label className={labelClass}>Popularnost grada (0–10)</label>
          <input
            className={inputClass}
            inputMode="numeric"
            value={mk.scoreInput}
            onChange={(e) => mk.setScoreInput(e.target.value)}
            placeholder="0"
          />
          <p className="mt-1 text-[10px] text-slate-500">
            Veća vrednost gura grad više u listama i pretrazi.
          </p>
        </div>
        <button
          type="button"
          onClick={mk.saveScore}
          disabled={mk.isSaving || mk.isLoading}
          className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-500 disabled:opacity-40"
        >
          {mk.isSaving ? "Čuvam..." : "Sačuvaj popularnost"}
        </button>
      </div>
    </div>
  );
}
