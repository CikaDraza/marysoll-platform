"use client";

import { useMemo } from "react";
import { useCategories } from "@/hooks/useCategories";
import { useAdminServices } from "@/hooks/useAdminServices";

const i2 = [
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm",
  "text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800",
  "focus:outline-none focus:ring-2 focus:ring-violet-400 transition",
  "placeholder:text-gray-400 dark:placeholder:text-gray-500",
].join(" ");

const l2 =
  "block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5";
const priceModeOptions = [
  { value: "fixed", label: "Fiksna cena" },
  { value: "on_request", label: "Cena na upit" },
] as const;

interface Props {
  s: ReturnType<typeof useAdminServices>;
}

export function ServiceModal({ s }: Props) {
  const { form } = s;
  const isEdit = s.modalMode === "edit";
  const { data: categories = [] } = useCategories();
  const selectedCategory = useMemo(
    () => categories.find((c) => c.key === form.categorySlug) ?? null,
    [categories, form.categorySlug],
  );

  const subType = form.subscription.subscriptionType ?? "monthly";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col border border-gray-100 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="font-bold text-gray-800 dark:text-white">
              {isEdit ? "Izmeni uslugu" : "Dodaj novu uslugu"}
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {isEdit
                ? `Uređivanje: ${s.editingService?.name}`
                : "Popunite podatke o usluzi"}
            </p>
          </div>
          <button
            onClick={s.closeModal}
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-xl transition"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={l2}>Naziv usluge *</label>
              <input
                className={i2}
                value={form.name}
                onChange={(e) => s.setField("name", e.target.value)}
                placeholder="npr. Gel lak — ceo set"
              />
            </div>
            <div className="col-span-2">
              <label className={l2}>Kategorija *</label>
              <select
                className={i2}
                value={form.categorySlug ?? ""}
                onChange={(e) => {
                  const selected = categories.find(
                    (c) => c.key === e.target.value,
                  );
                  s.setField("categorySlug", selected?.key ?? "");
                  s.setField("category", selected?.label ?? "");
                  s.setField("subcategory", "");
                }}
                required
              >
                <option value="">-- Izaberi kategoriju --</option>
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            {selectedCategory && selectedCategory.subcategories.length > 0 && (
              <div className="col-span-2">
                <label className={l2}>Podkategorija</label>
                <select
                  className={i2}
                  value={form.subcategory ?? ""}
                  onChange={(e) => s.setField("subcategory", e.target.value)}
                >
                  <option value="">-- Podkategorija --</option>
                  {selectedCategory.subcategories.map((sub) => (
                    <option key={sub.key} value={sub.label}>
                      {sub.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={l2}>Tip *</label>
              <select
                className={i2}
                value={form.type}
                onChange={(e) =>
                  s.setField(
                    "type",
                    e.target.value as "single" | "group" | "variant",
                  )
                }
              >
                <option value="single">Single — jedna cena</option>
                <option value="variant">Variant — više varijanti</option>
                <option value="group">Group — paket usluga</option>
              </select>
            </div>
            <div>
              <label className={l2}>Istaknuta pozicija</label>
              <select
                className={i2}
                value={form.featured ?? "none"}
                onChange={(e) =>
                  s.setField(
                    "featured",
                    e.target.value as "main" | "second" | "third" | "none",
                  )
                }
              >
                <option value="none">Nije istaknuta</option>
                <option value="main">⭐ Glavna</option>
                <option value="second">Druga</option>
                <option value="third">Treća</option>
              </select>
            </div>
          </div>

          {form.type === "single" && (
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
              <div className="col-span-2">
                <label className={l2}>Tip cene</label>
                <select
                  className={i2}
                  value={form.priceMode ?? "fixed"}
                  onChange={(e) => {
                    const priceMode = e.target.value as
                      | "fixed"
                      | "on_request";
                    s.setField("priceMode", priceMode);
                    if (priceMode === "on_request") {
                      s.setField("basePrice", null);
                    }
                  }}
                >
                  {priceModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={l2}>Cena (RSD) *</label>
                <input
                  type="number"
                  className={i2}
                  value={form.basePrice ?? ""}
                  disabled={form.priceMode === "on_request"}
                  onChange={(e) =>
                    s.setField(
                      "basePrice",
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  placeholder="2000"
                  min={0}
                />
              </div>
              <div>
                <label className={l2}>Trajanje (min) *</label>
                <input
                  type="number"
                  className={i2}
                  value={form.duration ?? ""}
                  onChange={(e) =>
                    s.setField(
                      "duration",
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  placeholder="60"
                  min={5}
                />
              </div>
            </div>
          )}

          {form.type === "variant" && (
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className={l2 + " mb-0"}>Varijante</span>
                <button
                  onClick={s.addVariant}
                  className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 hover:bg-violet-200 px-3 py-1.5 rounded-lg transition"
                >
                  + Dodaj
                </button>
              </div>
              {(form.variants ?? []).map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className={i2 + " flex-1"}
                    value={v.name}
                    onChange={(e) => s.updateVariant(i, "name", e.target.value)}
                    placeholder="Naziv"
                  />
                  <input
                    type="number"
                    className={i2 + " flex-1"}
                    value={v.price || ""}
                    disabled={v.priceMode === "on_request"}
                    onChange={(e) =>
                      s.updateVariant(i, "price", Number(e.target.value))
                    }
                    placeholder="RSD"
                    min={0}
                  />
                  <select
                    className={i2 + " flex-1"}
                    value={v.priceMode ?? "fixed"}
                    onChange={(e) => {
                      const priceMode = e.target.value as
                        | "fixed"
                        | "on_request";
                      s.updateVariant(i, "priceMode", priceMode);
                      if (priceMode === "on_request") {
                        s.updateVariant(i, "price", 0);
                      }
                    }}
                  >
                    {priceModeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className={i2 + " flex-0 min-w-26"}
                    value={v.duration || ""}
                    onChange={(e) =>
                      s.updateVariant(i, "duration", Number(e.target.value))
                    }
                    placeholder="Min"
                    min={1}
                  />
                  <button
                    onClick={() => s.removeVariant(i)}
                    className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition text-xl"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {form.type === "group" && (
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className={l2 + " mb-0"}>Usluge u paketu</span>
                <button
                  onClick={s.addGroupService}
                  className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 hover:bg-violet-200 px-3 py-1.5 rounded-lg transition"
                >
                  + Dodaj
                </button>
              </div>
              {(form.services ?? []).map((sv, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className={i2 + " flex-1"}
                    value={sv.name}
                    onChange={(e) =>
                      s.updateGroupService(i, "name", e.target.value)
                    }
                    placeholder="Naziv"
                  />
                  <input
                    type="number"
                    className={i2 + " flex-1"}
                    value={sv.price || ""}
                    disabled={sv.priceMode === "on_request"}
                    onChange={(e) =>
                      s.updateGroupService(i, "price", Number(e.target.value))
                    }
                    placeholder="RSD"
                    min={0}
                  />
                  <select
                    className={i2 + " flex-1"}
                    value={sv.priceMode ?? "fixed"}
                    onChange={(e) => {
                      const priceMode = e.target.value as
                        | "fixed"
                        | "on_request";
                      s.updateGroupService(i, "priceMode", priceMode);
                      if (priceMode === "on_request") {
                        s.updateGroupService(i, "price", 0);
                      }
                    }}
                  >
                    {priceModeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className={i2 + " flex-0 min-w-26"}
                    value={sv.duration || ""}
                    onChange={(e) =>
                      s.updateGroupService(
                        i,
                        "duration",
                        Number(e.target.value),
                      )
                    }
                    placeholder="Min"
                    min={1}
                  />
                  <button
                    onClick={() => s.removeGroupService(i)}
                    className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition text-xl"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {(form.type === "variant" || form.type === "group") && (
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className={l2 + " mb-0"}>Dodaci (opcioni)</span>
                <button
                  onClick={s.addExtra}
                  className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 px-3 py-1.5 rounded-lg transition"
                >
                  + Dodaj
                </button>
              </div>
              {(form.extras ?? []).map((ex, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className={i2 + " flex-1"}
                    value={ex.name}
                    onChange={(e) => s.updateExtra(i, "name", e.target.value)}
                    placeholder="Naziv dodatka"
                  />
                  <input
                    type="number"
                    className={i2 + " flex-1"}
                    value={ex.price || ""}
                    disabled={ex.priceMode === "on_request"}
                    onChange={(e) =>
                      s.updateExtra(i, "price", Number(e.target.value))
                    }
                    placeholder="RSD"
                    min={0}
                  />
                  <select
                    className={i2 + " flex-1"}
                    value={ex.priceMode ?? "fixed"}
                    onChange={(e) => {
                      const priceMode = e.target.value as
                        | "fixed"
                        | "on_request";
                      s.updateExtra(i, "priceMode", priceMode);
                      if (priceMode === "on_request") {
                        s.updateExtra(i, "price", 0);
                      }
                    }}
                  >
                    {priceModeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className={i2 + " flex-0 min-w-26"}
                    value={ex.duration || ""}
                    onChange={(e) =>
                      s.updateExtra(i, "duration", Number(e.target.value))
                    }
                    placeholder="Min"
                    min={0}
                  />
                  <button
                    onClick={() => s.removeExtra(i)}
                    className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition text-xl"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className={l2}>Opis usluge</label>
            <textarea
              className={i2 + " resize-none"}
              rows={3}
              value={form.description}
              onChange={(e) => s.setField("description", e.target.value)}
              placeholder="Šta je uključeno, napomene za klijente..."
            />
          </div>

          <div>
            <label className={l2}>
              Navedite šta usluga sadrži (svaka stavka novi red)
            </label>
            <textarea
              className={i2 + " resize-none"}
              rows={4}
              value={(form.items ?? []).join("\n")}
              onChange={(e) => s.setField("items", e.target.value.split("\n"))}
              placeholder={"Stavka 1\nStavka 2\nStavka 3"}
            />
          </div>

          {/* ── Subscription ─────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${form.subscription.enabled ? "bg-violet-500" : "bg-gray-200 dark:bg-gray-700"}`}
                onClick={() =>
                  s.setSubscriptionField("enabled", !form.subscription.enabled)
                }
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${form.subscription.enabled ? "translate-x-5" : "translate-x-1"}`}
                />
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Pretplata za ovu uslugu
              </span>
            </label>

            {form.subscription.enabled && (
              <div className="space-y-3">
                {/* Subscription type */}
                <div>
                  <label className={l2}>Vrsta pretplate</label>
                  <select
                    className={i2}
                    value={subType}
                    onChange={(e) => {
                      s.setSubscriptionField(
                        "subscriptionType",
                        e.target.value as "monthly" | "package",
                      );
                      if (e.target.value === "monthly")
                        s.setSubscriptionField("treatmentCount", null);
                    }}
                  >
                    <option value="monthly">Mesečna pretplata</option>
                    <option value="package">Paket tretmana</option>
                  </select>
                </div>

                {/* Treatment count — only for package */}
                {subType === "package" && (
                  <div>
                    <label className={l2}>Broj tretmana</label>
                    <input
                      type="number"
                      className={i2}
                      value={form.subscription.treatmentCount ?? ""}
                      onChange={(e) =>
                        s.setSubscriptionField(
                          "treatmentCount",
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                      placeholder="10"
                      min={1}
                    />
                  </div>
                )}

                {/* Price */}
                <div>
                  <label className={l2}>
                    {subType === "package"
                      ? "Cena paketa (RSD)"
                      : "Mesečna cena (RSD)"}
                  </label>
                  <input
                    type="number"
                    className={i2}
                    value={form.subscription.priceMonthly ?? ""}
                    onChange={(e) =>
                      s.setSubscriptionField(
                        "priceMonthly",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    placeholder="5000"
                    min={0}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={s.closeModal}
            className="cursor-pointer px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium"
          >
            Odustani
          </button>
          <button
            onClick={() => s.save()}
            disabled={s.isSaving}
            className="px-7 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition disabled:opacity-50 cursor-pointer"
          >
            {s.isSaving
              ? "Snimanje..."
              : isEdit
                ? "Sačuvaj izmene"
                : "Dodaj uslugu"}
          </button>
        </div>
      </div>
    </div>
  );
}
