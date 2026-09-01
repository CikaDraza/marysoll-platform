"use client";
/**
 * RadnoVremeTab — izdvojen iz app/dashboard/page.tsx (Faza 4c).
 * Sav state/handleri žive u AdminDashboard i stižu kroz DashboardTabProps.
 */
import { Time24Input } from "@/components/shared/Time24Input";
import { DAYS_OF_WEEK } from "@/types";
import type { DayOfWeek } from "@/types";
import { card, formatManualDayLabel } from "./shared";
import { isVacationExpired } from "@/helpers/vacations";

// Test prekidač: kad je true, "istekao" badge se prikazuje na SVIM odmorima
// (pregled pulsiranja). U produkciji vratiti na false — prikazuje se samo
// kada je odmor stvarno istekao.
const TEST_ALWAYS_SHOW_EXPIRED_BADGE = false;
import type { DashboardTabProps } from "./types";



export function RadnoVremeTab(props: DashboardTabProps) {
  const {
    manualDateKeys,
    setManualDaysCount,
    sp,
    svc,
  } = props;

  return (
  <div className={card}>
    {/* Mobilni: Sačuvaj na samom vrhu (desktop ima dugme desno u headeru) */}
    <button
      onClick={() => sp.save()}
      disabled={sp.isSaving}
      className="sm:hidden w-full mb-4 px-5 py-3 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition disabled:opacity-50"
    >
      {sp.isSaving ? "Snimanje..." : "Sačuvaj"}
    </button>
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h2 className="font-bold text-gray-900 dark:text-white">
          {sp.form.availabilityMode === "manualSlots"
            ? "Pojedinačni termini"
            : "Radno vreme"}
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {sp.form.availabilityMode === "manualSlots"
            ? "Ručno dodaj tačne termine po datumu. Svaki termin može imati svoje trajanje."
            : "Prazan dan = neradan dan. Klik + dodaj smenu za više slotova."}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
          <span>Izmena i otkazivanje najkasnije</span>
          <input
            type="number"
            min={0}
            step={1}
            value={sp.form.cancellationWindowHours}
            onChange={(e) =>
              sp.setField(
                "cancellationWindowHours",
                Math.max(0, Math.floor(Number(e.target.value) || 0)),
              )
            }
            className="w-16 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
          <span>sati pre početka termina</span>
        </label>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 sm:max-w-xs">
          Klijent može regularno da izmeni ili otkaže termin najkasnije toliko
          sati pre početka. Posle toga izmena više nije moguća, a otkazivanje se
          evidentira kao kasno.
        </p>
      </div>

      {/* Sistemsko pravilo platforme — nema podešavanja, samo obaveštenje, da
          vlasnica zna zašto klijent ponekad sme da menja i van njenog roka. */}
      <div className="mb-6 flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
        <span aria-hidden className="text-base leading-none">
          ⚠️
        </span>
        <div>
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
            30 minuta za ispravku rezervacije
          </p>
          <p className="text-[11px] text-amber-700/90 dark:text-amber-400/80 mt-0.5">
            Nakon zakazivanja klijent ima 30 minuta da promeni ili otkaže termin
            bez posledica, čak i ako je termin zakazan unutar roka za izmene i
            otkazivanje.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          onClick={() => sp.save()}
          disabled={sp.isSaving}
          className="hidden sm:inline-flex justify-center px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition disabled:opacity-50"
        >
          {sp.isSaving ? "Snimanje..." : "Sačuvaj"}
        </button>
      </div>
    </div>

    {/* Red: levo prekidač režima dostupnosti, desno godišnji odmor */}
    <div className="mb-6 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      {/* Prekidač režima dostupnosti: radno vreme ILI pojedinačni termini */}
      <div className="inline-flex self-start rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-1">
        {(
          [
            ["workingHours", "Radno vreme"],
            ["manualSlots", "Pojedinačni termini"],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => sp.setAvailabilityMode(mode)}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition ${
              sp.form.availabilityMode === mode
                ? "bg-violet-600 text-white shadow"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Podesi godišnji odmor — opsezi datuma, prikazuju se kao badge na sajtu */}
      <div className="w-full lg:max-w-md rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 p-2 sm:p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
              Podesi godišnji odmor
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Tokom odmora se na sajtu prikazuje napomena sa datumima.
            </p>
          </div>
          <button
            type="button"
            onClick={() => sp.addVacation()}
            className="flex-shrink-0 text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 hover:bg-violet-200 px-2 sm:px-3 py-1.5 rounded-lg transition"
          >
            + dodaj
          </button>
        </div>

        {sp.form.vacations.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Nema unetih odmora.
          </p>
        ) : (
          <div className="space-y-2">
            {sp.form.vacations.map((v, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-center gap-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 sm:px-3 py-2"
              >
                <input
                  type="date"
                  value={v.from}
                  max={v.to || undefined}
                  onChange={(e) =>
                    sp.updateVacation(idx, "from", e.target.value)
                  }
                  aria-label="Početak odmora"
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
                <span className="text-xs text-gray-400 font-medium">
                  do
                </span>
                <input
                  type="date"
                  value={v.to}
                  min={v.from || undefined}
                  onChange={(e) =>
                    sp.updateVacation(idx, "to", e.target.value)
                  }
                  aria-label="Kraj odmora"
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
                <div className="ml-auto flex items-center gap-2">
                  {(TEST_ALWAYS_SHOW_EXPIRED_BADGE || isVacationExpired(v)) && (
                    <span className="animate-pulse flex-shrink-0 text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 px-2 sm:px-3 py-1.5 rounded-lg">
                      istekao
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => sp.removeVacation(idx)}
                    className="text-xs text-red-400 hover:text-red-600 font-semibold px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                  >
                    − Ukloni
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Prikaz radnog vremena na sajtu (landing, termini, footer, panel, kalendar) */}
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 p-4">
      <button
        type="button"
        role="switch"
        aria-checked={sp.form.showWorkingHours}
        disabled={sp.form.availabilityMode === "manualSlots"}
        onClick={() => sp.setShowWorkingHours(!sp.form.showWorkingHours)}
        className={`relative mt-0.5 h-6 w-11 flex-shrink-0 rounded-full transition ${
          sp.form.availabilityMode === "manualSlots"
            ? "bg-gray-200 dark:bg-gray-700 cursor-not-allowed opacity-60"
            : sp.form.showWorkingHours
              ? "bg-violet-600"
              : "bg-gray-300 dark:bg-gray-600"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            sp.form.showWorkingHours ? "translate-x-5" : ""
          }`}
        />
      </button>
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
          Prikaži radno vreme na sajtu
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {sp.form.availabilityMode === "manualSlots"
            ? "U režimu pojedinačnih termina radno vreme se ne prikazuje nigde (jer ga nema). Umesto njega stoji kratka napomena sa linkom na pravila zakazivanja."
            : "Kada je isključeno, radno vreme se ne prikazuje nigde (landing, termini, footer, panel, kalendar) — umesto njega stoji kratka napomena sa linkom na pravila zakazivanja."}
        </p>
      </div>
    </div>

    {sp.form.availabilityMode === "workingHours" && (
    <div className="space-y-3">
      {DAYS_OF_WEEK.map((day: DayOfWeek) => {
        const slots = sp.form.workingHours[day] ?? [];
        const isRest = slots.length === 0;
        return (
          <div
            key={day}
            className={`rounded-2xl border p-4 transition-colors ${isRest ? "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800" : "bg-violet-50/40 dark:bg-gray-900 border-violet-100 dark:border-violet-900/40"}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="w-[82px] sm:w-[108px] flex-shrink-0 text-[13px] sm:text-sm font-bold text-gray-700 dark:text-gray-300">
                  {day}
                </span>
                <span
                  className={`whitespace-nowrap text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${isRest ? "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400" : "bg-violet-200 dark:bg-violet-900/50 text-violet-700 dark:text-violet-400"}`}
                >
                  {isRest ? "Neradan" : `${slots.length} smena`}
                </span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <button
                  onClick={() => sp.addTimeSlot(day)}
                  className="whitespace-nowrap text-[11px] sm:text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 hover:bg-violet-200 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg transition"
                >
                  + Smena
                </button>
                {!isRest && (
                  <button
                    onClick={() => sp.clearDay(day)}
                    className="text-[11px] sm:text-xs text-red-400 hover:text-red-600 font-semibold px-1.5 py-1 sm:px-2 sm:py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                  >
                    Obriši
                  </button>
                )}
              </div>
            </div>
            {slots.length > 0 && (
              <div className="mt-3 space-y-2">
                {slots.map((slot, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-4 text-right">
                      {idx + 1}.
                    </span>
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-1.5 flex-1">
                      <span className="text-xs text-gray-400 font-medium">
                        od
                      </span>
                      <Time24Input
                        value={slot.from}
                        onChange={(v) =>
                          sp.updateTimeSlot(day, idx, "from", v)
                        }
                        aria-label="Početak smene"
                        className="w-16 text-sm font-semibold text-gray-800 dark:text-gray-200 bg-transparent focus:outline-none"
                      />
                      <span className="text-gray-300 dark:text-gray-600">
                        |
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        do
                      </span>
                      <Time24Input
                        value={slot.to}
                        onChange={(v) =>
                          sp.updateTimeSlot(day, idx, "to", v)
                        }
                        aria-label="Kraj smene"
                        className="w-16 text-sm font-semibold text-gray-800 dark:text-gray-200 bg-transparent focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => sp.removeTimeSlot(day, idx)}
                      className="w-8 h-8 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition text-lg"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
    )}

    {sp.form.availabilityMode === "manualSlots" && (
      <div className="space-y-3">
        {manualDateKeys.map((dateKey) => {
          const slots = sp.form.manualSlots[dateKey] ?? [];
          const isRest = slots.length === 0;
          return (
            <div
              key={dateKey}
              className={`rounded-2xl border p-4 transition-colors ${isRest ? "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800" : "bg-violet-50/40 dark:bg-gray-900 border-violet-100 dark:border-violet-900/40"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-20 sm:w-[108px] flex-shrink sm:flex-shrink-0 truncate text-[12px] sm:text-sm font-bold text-gray-700 dark:text-gray-300">
                    {formatManualDayLabel(dateKey)}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap ${isRest ? "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400" : "bg-violet-200 dark:bg-violet-900/50 text-violet-700 dark:text-violet-400"}`}
                  >
                    {isRest
                      ? "Neradan"
                      : `${slots.length} termin${slots.length === 1 ? "" : "a"}`}
                  </span>
                </div>
                <button
                  onClick={() => sp.addManualSlot(dateKey)}
                  className="flex-shrink-0 whitespace-nowrap text-[11px] font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 hover:bg-violet-200 px-2.5 py-1.5 rounded-lg transition"
                >
                  + Termin
                </button>
              </div>
              {slots.length > 0 && (
                <div className="mt-3 space-y-2">
                  {slots.map((slot, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <span className="text-xs text-gray-400 w-4 text-right">
                        {idx + 1}.
                      </span>
                      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-1.5">
                        <span className="text-xs text-gray-400 font-medium">
                          u
                        </span>
                        <Time24Input
                          value={slot.time}
                          onChange={(v) =>
                            sp.updateManualSlot(dateKey, idx, "time", v)
                          }
                          aria-label="Vreme termina"
                          className="w-16 text-sm font-semibold text-gray-800 dark:text-gray-200 bg-transparent focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-1.5">
                        <span className="text-xs text-gray-400 font-medium">
                          trajanje
                        </span>
                        <input
                          type="number"
                          min={5}
                          step={5}
                          value={slot.duration}
                          onChange={(e) =>
                            sp.updateManualSlot(
                              dateKey,
                              idx,
                              "duration",
                              Math.max(
                                5,
                                Math.floor(Number(e.target.value) || 0),
                              ),
                            )
                          }
                          aria-label="Trajanje termina u minutima"
                          className="w-14 text-sm font-semibold text-gray-800 dark:text-gray-200 bg-transparent focus:outline-none"
                        />
                        <span className="text-xs text-gray-400 font-medium">
                          min
                        </span>
                      </div>
                      {svc.services.length > 0 && (
                        <select
                          value={slot.serviceId ?? ""}
                          onChange={(e) => {
                            const id = e.target.value;
                            sp.updateManualSlot(
                              dateKey,
                              idx,
                              "serviceId",
                              id,
                            );
                            const chosen = svc.services.find(
                              (s) => s._id === id,
                            );
                            if (chosen?.duration)
                              sp.updateManualSlot(
                                dateKey,
                                idx,
                                "duration",
                                chosen.duration,
                              );
                          }}
                          aria-label="Usluga (opciono)"
                          className="text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        >
                          <option value="">Usluga (opciono)</option>
                          {svc.services.map((s) => (
                            <option key={s._id} value={s._id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        onClick={() =>
                          sp.removeManualSlot(dateKey, idx)
                        }
                        className="w-8 h-8 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition text-lg"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Proširivanje liste — popuni i ceo mesec, do godišnjeg odmora */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() =>
              setManualDaysCount(manualDateKeys.length + 1)
            }
            className="text-sm font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40 border border-dashed border-violet-300 dark:border-violet-800 px-4 py-2.5 rounded-xl transition"
          >
            + Dodaj dan
          </button>
          <button
            onClick={() =>
              setManualDaysCount(manualDateKeys.length + 7)
            }
            className="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-2.5 rounded-xl transition"
          >
            + 7 dana
          </button>
        </div>
      </div>
    )}

    {/* Mobilni: Sačuvaj i na dnu (desktop ima dugme u headeru) */}
    <button
      onClick={() => sp.save()}
      disabled={sp.isSaving}
      className="sm:hidden w-full mt-6 px-5 py-3 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition disabled:opacity-50"
    >
      {sp.isSaving ? "Snimanje..." : "Sačuvaj"}
    </button>
  </div>
  );
}
