"use client";
/**
 * UslugeTab — izdvojen iz app/dashboard/page.tsx (Faza 4c).
 * Sav state/handleri žive u AdminDashboard i stižu kroz DashboardTabProps.
 */
import type { IService } from "@/types";
import { TYPE_BADGE, card, servicePrice } from "./shared";
import type { DashboardTabProps } from "./types";



export function UslugeTab(props: DashboardTabProps) {
  const {
    svc,
  } = props;

  return (
  <div className="space-y-5">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="font-bold text-gray-900 dark:text-white">
          Usluge
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {svc.services.length} ukupno
        </p>
      </div>
      <button
        onClick={svc.openCreate}
        className="cursor-pointer flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition"
      >
        + Dodaj uslugu
      </button>
    </div>
    {svc.isLoading && (
      <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-16">
        <span className="w-5 h-5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin inline-block" />
        Učitavanje usluga...
      </div>
    )}
    {!svc.isLoading && svc.services.length === 0 && (
      <div className={card + " text-center py-16"}>
        <div className="text-5xl mb-4">✂️</div>
        <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
          Nema usluga
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
          Dodajte prvu uslugu i ona će se prikazati klijentima.
        </p>
        <button
          onClick={svc.openCreate}
          className="cursor-pointer px-6 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition"
        >
          + Dodaj prvu uslugu
        </button>
      </div>
    )}
    {!svc.isLoading &&
      svc.services.length > 0 &&
      (() => {
        const grouped = svc.services.reduce<Record<string, IService[]>>(
          (acc, s) => {
            const c = s.category || "Ostalo";
            if (!acc[c]) acc[c] = [];
            acc[c].push(s);
            return acc;
          },
          {},
        );
        return Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest">
                {cat}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {items.length}
              </span>
            </div>
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
              {items.map((srv, i) => (
                <div
                  key={srv._id}
                  className={`flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition group ${i > 0 ? "border-t border-gray-100 dark:border-gray-800" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {srv.name}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${TYPE_BADGE[srv.type] ?? "bg-gray-100 text-gray-500"}`}
                      >
                        {srv.type}
                      </span>
                      {srv.featured && srv.featured !== "none" && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                          ★ {srv.featured}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {servicePrice(srv)}
                      </span>
                      {srv.duration && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          ⏱ {srv.duration} min
                        </span>
                      )}
                      {srv.subcategory && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {srv.subcategory}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 w-full sm:w-auto justify-end opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity border-t border-gray-100 dark:border-gray-800 pt-2.5 sm:border-t-0 sm:pt-0">
                    {/* Mobilni: dugmad vidljiva ispod info reda; desktop: on hover, desno */}
                    <button
                      onClick={() => svc.openEdit(srv)}
                      className="p-2 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition text-sm"
                      title="Izmeni"
                    >
                      ✏️
                    </button>
                    {svc.deleteConfirmId === srv._id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => svc.confirmDelete(srv._id)}
                          disabled={svc.isDeleting}
                          className="px-2.5 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg"
                        >
                          {svc.isDeleting ? "..." : "Obriši"}
                        </button>
                        <button
                          onClick={() => svc.setDeleteConfirmId(null)}
                          className="px-2 py-1.5 text-gray-400 text-xs hover:text-gray-600"
                        >
                          Odustani
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => svc.setDeleteConfirmId(srv._id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition text-sm"
                        title="Obriši"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ));
      })()}
  </div>
  );
}
