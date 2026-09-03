"use client";

/**
 * Growth Studio — admin tab (?tab=growth).
 * MVP: Podešavanja (jedna jednostavna forma) / Klijenti / Vaučeri.
 * Buduci moduli (tieri, referral, promocije) dobijaju svoje sekcije ovde.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { CheckinQrCard } from "./CheckinQrCard";
import toast from "react-hot-toast";
import {
  useLoyaltyAdminConfig,
  useSaveLoyaltyConfig,
} from "@/hooks/loyalty/useLoyaltyAdminConfig";
import type { LoyaltyAdminConfig } from "@/types/loyalty-admin";
import { LoyaltyClients } from "./LoyaltyClients";
import { LoyaltyVouchers } from "./LoyaltyVouchers";
import { LoyaltyDuplicates } from "./LoyaltyDuplicates";
import { PointsShopEditor } from "./PointsShopEditor";

type Section = "podesavanja" | "klijenti" | "duplikati" | "vauceri";

const card =
  "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6";
const lbl =
  "block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5";
const inp =
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30";

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 group"
    >
      <span
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
          checked ? "bg-violet-600" : "bg-gray-300 dark:bg-gray-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </span>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
    </button>
  );
}

function ConfigForm() {
  const { data, isLoading } = useLoyaltyAdminConfig();

  if (isLoading || !data?.config) {
    return <div className="rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse h-64" />;
  }
  return <ConfigFormInner initial={data.config} />;
}

function ConfigFormInner({ initial }: { initial: LoyaltyAdminConfig }) {
  const save = useSaveLoyaltyConfig();
  const [form, setForm] = useState<LoyaltyAdminConfig>(() => {
    // Normalizuj: stari config-i nemaju checkin/streak/sharing (Phase 1/2 polja).
    const c = structuredClone(initial) as LoyaltyAdminConfig;
    if (c.earning.checkinPoints == null) c.earning.checkinPoints = 10;
    if (!c.streak) c.streak = { windowDays: 45 };
    if (!c.sharing)
      c.sharing = {
        enabled: false,
        friendReward: {
          type: "percent",
          value: 15,
          serviceName: "",
          expiresDays: 30,
        },
        maxActivePerClient: 3,
        referrerRewardPoints: 100,
      };
    if (c.sharing.referrerRewardPoints == null)
      c.sharing.referrerRewardPoints = 100;
    return c;
  });

  const set = (updater: (draft: LoyaltyAdminConfig) => void) => {
    setForm((prev) => {
      const next = structuredClone(prev) as LoyaltyAdminConfig;
      updater(next);
      return next;
    });
  };

  const milestone = form.milestones[0] ?? {
    heartsRequired: 5,
    reward: { type: "percent" as const, value: 20, serviceName: "", expiresDays: 90 },
  };

  const handleSave = async () => {
    try {
      const payload = structuredClone(form) as LoyaltyAdminConfig;
      payload.milestones = [milestone];
      await save.mutateAsync(payload);
      toast.success("Podešavanja sačuvana");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Greška pri čuvanju";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Program on/off ── */}
      <div className={card}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black text-gray-900 dark:text-white">
              Program nagrađivanja
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Klijenti sakupljaju {form.currencies.hearts.nameMany}{" "}
              {form.currencies.hearts.emoji} dolascima i osvajaju nagrade.
            </p>
          </div>
          <Toggle
            checked={form.enabled}
            onChange={(v) => set((d) => void (d.enabled = v))}
            label={form.enabled ? "Uključen" : "Isključen"}
          />
        </div>
      </div>

      {/* ── Srca ── */}
      <div className={card}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-black text-gray-900 dark:text-white">
            {form.currencies.hearts.emoji} Lojalnost (
            {form.currencies.hearts.nameMany})
          </h3>
          <Toggle
            checked={form.currencies.hearts.enabled}
            onChange={(v) => set((d) => void (d.currencies.hearts.enabled = v))}
            label=""
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={lbl}>Naziv (jednina)</label>
            <input
              className={inp}
              value={form.currencies.hearts.nameOne}
              onChange={(e) =>
                set((d) => void (d.currencies.hearts.nameOne = e.target.value))
              }
            />
          </div>
          <div>
            <label className={lbl}>Naziv (2-4)</label>
            <input
              className={inp}
              value={form.currencies.hearts.nameFew}
              onChange={(e) =>
                set((d) => void (d.currencies.hearts.nameFew = e.target.value))
              }
            />
          </div>
          <div>
            <label className={lbl}>Naziv (5+)</label>
            <input
              className={inp}
              value={form.currencies.hearts.nameMany}
              onChange={(e) =>
                set((d) => void (d.currencies.hearts.nameMany = e.target.value))
              }
            />
          </div>
          <div>
            <label className={lbl}>Simbol</label>
            <input
              className={inp}
              value={form.currencies.hearts.emoji}
              onChange={(e) =>
                set((d) => void (d.currencies.hearts.emoji = e.target.value))
              }
            />
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={lbl}>
              {form.currencies.hearts.nameFew} po završenoj poseti
            </label>
            <input
              type="number"
              min={0}
              max={10}
              className={inp}
              value={form.earning.heartsPerCompletedVisit}
              onChange={(e) =>
                set(
                  (d) =>
                    void (d.earning.heartsPerCompletedVisit =
                      parseInt(e.target.value, 10) || 0),
                )
              }
            />
          </div>
          <div>
            <label className={lbl}>Potrebno za nagradu</label>
            <input
              type="number"
              min={1}
              max={100}
              className={inp}
              value={milestone.heartsRequired}
              onChange={(e) =>
                set(
                  (d) =>
                    void (d.milestones = [
                      {
                        ...milestone,
                        heartsRequired: parseInt(e.target.value, 10) || 1,
                      },
                    ]),
                )
              }
            />
          </div>
        </div>

        {/* Milestone nagrada */}
        <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3">
            🎁 Nagrada ({milestone.heartsRequired}{" "}
            {form.currencies.hearts.nameMany} = ...)
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={lbl}>Tip nagrade</label>
              <select
                className={inp}
                value={milestone.reward.type}
                onChange={(e) =>
                  set(
                    (d) =>
                      void (d.milestones = [
                        {
                          ...milestone,
                          reward: {
                            ...milestone.reward,
                            type: e.target.value as
                              | "percent"
                              | "fixed"
                              | "free_service",
                          },
                        },
                      ]),
                  )
                }
              >
                <option value="percent">Popust (%)</option>
                <option value="fixed">Popust (RSD)</option>
                <option value="free_service">Gratis usluga</option>
              </select>
            </div>
            {milestone.reward.type !== "free_service" ? (
              <div>
                <label className={lbl}>
                  {milestone.reward.type === "percent" ? "Procenat" : "Iznos (RSD)"}
                </label>
                <input
                  type="number"
                  min={0}
                  className={inp}
                  value={milestone.reward.value}
                  onChange={(e) =>
                    set(
                      (d) =>
                        void (d.milestones = [
                          {
                            ...milestone,
                            reward: {
                              ...milestone.reward,
                              value: parseInt(e.target.value, 10) || 0,
                            },
                          },
                        ]),
                    )
                  }
                />
              </div>
            ) : (
              <div>
                <label className={lbl}>Naziv usluge</label>
                <input
                  className={inp}
                  placeholder="npr. Lash bath"
                  value={milestone.reward.serviceName ?? ""}
                  onChange={(e) =>
                    set(
                      (d) =>
                        void (d.milestones = [
                          {
                            ...milestone,
                            reward: {
                              ...milestone.reward,
                              serviceName: e.target.value,
                            },
                          },
                        ]),
                    )
                  }
                />
              </div>
            )}
            <div>
              <label className={lbl}>Vaučer važi (dana)</label>
              <input
                type="number"
                min={1}
                max={365}
                className={inp}
                value={milestone.reward.expiresDays}
                onChange={(e) =>
                  set(
                    (d) =>
                      void (d.milestones = [
                        {
                          ...milestone,
                          reward: {
                            ...milestone.reward,
                            expiresDays: parseInt(e.target.value, 10) || 90,
                          },
                        },
                      ]),
                  )
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Poeni ── */}
      <div className={card}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-black text-gray-900 dark:text-white">
              {form.currencies.points.emoji} Poeni na potrošnju
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Klijent dobija poene za svaki potrošeni dinar (opciono, uz srca).
            </p>
          </div>
          <Toggle
            checked={form.currencies.points.enabled}
            onChange={(v) => set((d) => void (d.currencies.points.enabled = v))}
            label=""
          />
        </div>
        {form.currencies.points.enabled && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={lbl}>Poena za 100 RSD</label>
              <input
                type="number"
                min={0}
                className={inp}
                value={form.currencies.points.per100Rsd}
                onChange={(e) =>
                  set(
                    (d) =>
                      void (d.currencies.points.per100Rsd =
                        parseInt(e.target.value, 10) || 0),
                  )
                }
              />
            </div>
            <div>
              <label className={lbl}>Bonus dobrodošlice (poena)</label>
              <input
                type="number"
                min={0}
                className={inp}
                value={form.earning.welcomeBonusPoints}
                onChange={(e) =>
                  set(
                    (d) =>
                      void (d.earning.welcomeBonusPoints =
                        parseInt(e.target.value, 10) || 0),
                  )
                }
              />
            </div>
          </div>
        )}
        {/* Katalog nagrada je vidljiv samo dok poeni rade; isključivanje poena
            NE briše konfiguraciju — samo je čini neaktivnom. */}
        {form.currencies.points.enabled && (
          <div className="mt-5 border-t border-gray-100 pt-5 dark:border-gray-800">
            <PointsShopEditor
              offers={form.pointsShop ?? []}
              pointsEmoji={form.currencies.points.emoji || "⭐"}
              onChange={(offers) => set((d) => void (d.pointsShop = offers))}
            />
          </div>
        )}
      </div>

      {/* ── No-show + auto-complete + celebration ── */}
      <div className={card}>
        <h3 className="text-sm font-black text-gray-900 dark:text-white mb-5">
          Pravila i automatizacija
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={lbl}>No-show politika</label>
            <select
              className={inp}
              value={form.noShowPolicy.mode}
              onChange={(e) =>
                set(
                  (d) =>
                    void (d.noShowPolicy.mode = e.target.value as
                      | "none"
                      | "streak_reset"
                      | "hearts_penalty"),
                )
              }
            >
              <option value="none">Bez posledica</option>
              <option value="streak_reset">Reset niza poseta (soft)</option>
              <option value="hearts_penalty">
                Oduzimanje {form.currencies.hearts.nameMany}
              </option>
            </select>
          </div>
          {form.noShowPolicy.mode === "hearts_penalty" && (
            <div>
              <label className={lbl}>Koliko se oduzima</label>
              <input
                type="number"
                min={0}
                max={10}
                className={inp}
                value={form.noShowPolicy.heartsPenalty}
                onChange={(e) =>
                  set(
                    (d) =>
                      void (d.noShowPolicy.heartsPenalty =
                        parseInt(e.target.value, 10) || 0),
                  )
                }
              />
            </div>
          )}
          <div>
            <label className={lbl}>Celebration animacije</label>
            <select
              className={inp}
              value={form.celebration.intensity}
              onChange={(e) =>
                set(
                  (d) =>
                    void (d.celebration.intensity = e.target.value as
                      | "off"
                      | "subtle"
                      | "normal"
                      | "max"),
                )
              }
            >
              <option value="off">Isključene</option>
              <option value="subtle">Diskretne</option>
              <option value="normal">Normalne</option>
              <option value="max">Maksimalne</option>
            </select>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                Automatsko označavanje završenih termina
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Prvo vas podsetimo da označite termin; ako ne reagujete,
                Marysoll ga automatski označi kao završen.
              </p>
            </div>
            <Toggle
              checked={form.autoComplete.enabled}
              onChange={(v) => set((d) => void (d.autoComplete.enabled = v))}
              label=""
            />
          </div>
          {form.autoComplete.enabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={lbl}>Podsetnik posle (sati)</label>
                <input
                  type="number"
                  min={1}
                  max={168}
                  className={inp}
                  value={form.autoComplete.promptAfterHours}
                  onChange={(e) =>
                    set(
                      (d) =>
                        void (d.autoComplete.promptAfterHours =
                          parseInt(e.target.value, 10) || 24),
                    )
                  }
                />
              </div>
              <div>
                <label className={lbl}>Auto-complete posle (sati)</label>
                <input
                  type="number"
                  min={2}
                  max={336}
                  className={inp}
                  value={form.autoComplete.autoAfterHours}
                  onChange={(e) =>
                    set(
                      (d) =>
                        void (d.autoComplete.autoAfterHours =
                          parseInt(e.target.value, 10) || 48),
                    )
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── QR check-in + Streak (Phase 1) ── */}
      <div className={card}>
        <h3 className="text-sm font-black text-gray-900 dark:text-white mb-1">
          🕐 QR check-in i niz poseta
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Klijent skenira QR u salonu (/checkin) i dobija poene; niz poseta
          (navika) raste dok dolazi u razmaku ispod praga.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={lbl}>Poena po check-inu</label>
            <input
              type="number"
              min={0}
              className={inp}
              value={form.earning.checkinPoints}
              onChange={(e) =>
                set(
                  (d) =>
                    void (d.earning.checkinPoints =
                      parseInt(e.target.value, 10) || 0),
                )
              }
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Traži uključene poene. 0 = bez poena (samo niz poseta).
            </p>
          </div>
          <div>
            <label className={lbl}>Prag niza poseta (dana)</label>
            <input
              type="number"
              min={1}
              max={365}
              className={inp}
              value={form.streak.windowDays}
              onChange={(e) =>
                set(
                  (d) =>
                    void (d.streak.windowDays =
                      parseInt(e.target.value, 10) || 45),
                )
              }
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Veći razmak od ovoga resetuje niz na 1.
            </p>
          </div>
        </div>
        <CheckinQrCard />
      </div>

      {/* ── Deljenje / Pozovi prijateljicu (Phase 2 share voucher) ── */}
      <div className={card}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black text-gray-900 dark:text-white">
              🎁 Pozovi prijateljicu (deljenje vaučera)
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Klijent iz svog panela nagrada poklanja popust prijateljici; ona
              ga iskoristi pri zakazivanju.
            </p>
          </div>
          <Toggle
            checked={form.sharing.enabled}
            onChange={(v) => set((d) => void (d.sharing.enabled = v))}
            label=""
          />
        </div>
        {form.sharing.enabled && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className={lbl}>Popust za prijateljicu</label>
              <select
                className={inp}
                value={form.sharing.friendReward.type}
                onChange={(e) =>
                  set(
                    (d) =>
                      void (d.sharing.friendReward.type = e.target.value as
                        | "percent"
                        | "fixed"
                        | "free_service"),
                  )
                }
              >
                <option value="percent">Procenat (%)</option>
                <option value="fixed">Iznos (RSD)</option>
                <option value="free_service">Gratis usluga</option>
              </select>
            </div>
            {form.sharing.friendReward.type !== "free_service" && (
              <div>
                <label className={lbl}>
                  {form.sharing.friendReward.type === "percent"
                    ? "Procenat"
                    : "Iznos (RSD)"}
                </label>
                <input
                  type="number"
                  min={0}
                  className={inp}
                  value={form.sharing.friendReward.value}
                  onChange={(e) =>
                    set(
                      (d) =>
                        void (d.sharing.friendReward.value =
                          parseInt(e.target.value, 10) || 0),
                    )
                  }
                />
              </div>
            )}
            <div>
              <label className={lbl}>Vaučer važi (dana)</label>
              <input
                type="number"
                min={1}
                max={365}
                className={inp}
                value={form.sharing.friendReward.expiresDays}
                onChange={(e) =>
                  set(
                    (d) =>
                      void (d.sharing.friendReward.expiresDays =
                        parseInt(e.target.value, 10) || 30),
                  )
                }
              />
            </div>
            <div>
              <label className={lbl}>Maks. poklona po klijentu</label>
              <input
                type="number"
                min={1}
                max={50}
                className={inp}
                value={form.sharing.maxActivePerClient}
                onChange={(e) =>
                  set(
                    (d) =>
                      void (d.sharing.maxActivePerClient =
                        parseInt(e.target.value, 10) || 3),
                  )
                }
              />
            </div>
            <div>
              <label className={lbl}>Poena osobi koja poziva</label>
              <input
                type="number"
                min={0}
                max={100000}
                className={inp}
                value={form.sharing.referrerRewardPoints}
                onChange={(e) =>
                  set(
                    (d) =>
                      void (d.sharing.referrerRewardPoints =
                        parseInt(e.target.value, 10) || 0),
                  )
                }
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Tek posle prve završene posete. Traži uključene poene.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={save.isPending}
          className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold shadow-sm transition"
        >
          {save.isPending ? "Čuvanje..." : "Sačuvaj podešavanja"}
        </button>
      </div>
    </div>
  );
}

/**
 * Tabovi sekcija — na mobilnom ne prelaze širinu ekrana nego se skroluju
 * horizontalno, sa strelicama na krajevima (strelice su skrivene od `sm` naviše
 * i kad na toj strani nema više sadržaja za skrol).
 */
function SectionTabs({
  sections,
  section,
  onSelect,
}: {
  sections: { id: Section; label: string }[];
  section: Section;
  onSelect: (id: Section) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const syncArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // 1px tolerancija — subpixel širine bi inače trajno držale strelicu upaljenu.
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    syncArrows();
    const ro = new ResizeObserver(syncArrows);
    ro.observe(el);
    return () => ro.disconnect();
  }, [syncArrows]);

  // Aktivan tab uvek u vidnom polju (npr. kad je zadnji izabran na uskom ekranu).
  useEffect(() => {
    const el = scrollerRef.current;
    const active = el?.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [section]);

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.7), behavior: "smooth" });
  };

  const arrow =
    "sm:hidden absolute top-0 bottom-px z-10 flex items-center justify-center w-7 text-gray-500 dark:text-gray-400";

  return (
    <div className="relative border-b border-gray-200 dark:border-gray-800">
      <div
        ref={scrollerRef}
        onScroll={syncArrows}
        className="flex gap-2 overflow-x-auto scrollbar-none"
      >
        {sections.map((s) => (
          <button
            key={s.id}
            data-active={section === s.id}
            onClick={() => onSelect(s.id)}
            className={`flex-shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition ${
              section === s.id
                ? "border-violet-600 text-violet-700 dark:text-violet-400"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {canLeft && (
        <button
          type="button"
          aria-label="Prethodni tabovi"
          onClick={() => scrollBy(-1)}
          className={`${arrow} left-0 bg-gradient-to-r from-gray-50 via-gray-50 dark:from-slate-900 dark:via-slate-900 to-transparent pr-2`}
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
      )}
      {canRight && (
        <button
          type="button"
          aria-label="Sledeći tabovi"
          onClick={() => scrollBy(1)}
          className={`${arrow} right-0 bg-gradient-to-l from-gray-50 via-gray-50 dark:from-slate-900 dark:via-slate-900 to-transparent pl-2`}
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default function AdminGrowthStudio() {
  const [section, setSection] = useState<Section>("podesavanja");

  const sections: { id: Section; label: string }[] = [
    { id: "podesavanja", label: "Podešavanja" },
    { id: "klijenti", label: "Klijenti" },
    { id: "duplikati", label: "Mogući duplikati" },
    { id: "vauceri", label: "Vaučeri" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-gray-900 dark:text-white">
          Growth Studio
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Program nagrađivanja — klijenti se vraćaju zbog nagrada, vi vidite ko
          su vam najverniji.
        </p>
      </div>

      <SectionTabs
        sections={sections}
        section={section}
        onSelect={setSection}
      />

      {section === "podesavanja" && <ConfigForm />}
      {section === "klijenti" && <LoyaltyClients />}
      {section === "duplikati" && <LoyaltyDuplicates />}
      {section === "vauceri" && <LoyaltyVouchers />}
    </div>
  );
}
