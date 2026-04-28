"use client";

import { useEffect, useMemo } from "react";
import { HomePagePosition, IService, IServiceInput } from "@/types";
import { useCategories } from "@/hooks/useCategories";

interface Props {
  editing?: IService | null;
  onClose: () => void;
  form: IServiceInput;
  setForm: React.Dispatch<React.SetStateAction<IServiceInput>>;
  save: () => Promise<void>;
}

export default function AdminServiceForm({
  editing,
  form,
  setForm,
  save,
  onClose,
}: Props) {
  const { data: categories = [] } = useCategories();

  const selectedCategory = useMemo(
    () => categories.find((c) => c.key === form.categorySlug) ?? null,
    [categories, form.categorySlug],
  );

  useEffect(() => {
    if (editing) {
      setForm({
        ...editing,
        basePrice: editing.basePrice ?? undefined,
        duration: editing.duration ?? undefined,
        items: editing.items || [],
        variants: editing.variants || [],
        extras: editing.extras || [],
        subscription: editing.subscription ?? {
          enabled: false,
          priceMonthly: null,
          startDate: "",
          endDate: "",
        },
      });
    }
  }, [editing, setForm]);

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    save();
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      {/* SERVICE TYPE */}
      <div>
        <label className="block text-sm font-semibold text-gray-700">
          Tip usluge
        </label>
        <select
          value={form.type}
          onChange={(e) =>
            setForm({
              ...form,
              type: e.target.value as "single" | "group" | "variant",
            })
          }
          className="mt-1 block w-full rounded-md border-gray-200 bg-gray-100 p-2"
        >
          <option value="single">Jedna usluga (single)</option>
          <option value="group">Grupa usluga (group)</option>
          <option value="variant">Varijante (variant)</option>
        </select>
      </div>

      {/* CATEGORY */}
      <div>
        <label className="block text-sm font-semibold text-gray-700">
          Kategorija
        </label>
        <select
          value={form.categorySlug ?? ""}
          onChange={(e) => {
            const selected = categories.find((c) => c.key === e.target.value);
            setForm({
              ...form,
              categorySlug: selected?.key ?? "",
              category: selected?.label ?? "",
              subcategory: "",
            });
          }}
          className="mt-1 block w-full rounded-md border-gray-200 bg-gray-100 p-2"
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

      {/* SUBCATEGORY */}
      {selectedCategory && selectedCategory.subcategories.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-gray-700">
            Podkategorija (opciono)
          </label>
          <select
            value={form.subcategory ?? ""}
            onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-200 bg-gray-100 p-2"
          >
            <option value="">-- Podkategorija --</option>
            {selectedCategory.subcategories.map((s) => (
              <option key={s.key} value={s.label}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* SERVICE NAME */}
      <div>
        <label className="block text-sm font-semibold text-gray-700">
          Naziv usluge
        </label>
        <input
          type="text"
          value={form.name ?? ""}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-200 p-2 bg-gray-100"
          required
        />
      </div>

      {form.type === "group" && (
        <div className="p-3 rounded-md bg-gray-100 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-700">Grupa usluga</h3>
            <button
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  variants: [
                    ...(form.variants || []),
                    { name: "", price: 0, duration: 0, perItem: false },
                  ],
                })
              }
              className="cursor-pointer px-3 py-1 bg-(--primary-color) hover:bg-(--primary-color-hover)/80 text-white rounded"
            >
              + Dodaj usluge
            </button>
          </div>

          {form.variants?.length === 0 && (
            <p className="text-xs text-gray-500">Nema usluga. Dodaj prvu.</p>
          )}

          {form.variants?.map((v, index) => (
            <div
              key={index}
              className="flex gap-3 items-center bg-white p-2 rounded"
            >
              <input
                type="text"
                placeholder="Naziv (npr. Gel lak)"
                value={v.name}
                onChange={(e) => {
                  const updated = [...form.variants!];
                  updated[index].name = e.target.value;
                  setForm({ ...form, variants: updated });
                }}
                className="flex-1 p-2 bg-gray-100 rounded border-gray-200"
              />

              <button
                type="button"
                onClick={() => {
                  const updated = form.variants!.filter((_, i) => i !== index);
                  setForm({ ...form, variants: updated });
                }}
                className="cursor-pointer size-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full"
              >
                X
              </button>
            </div>
          ))}
        </div>
      )}

      {form.type === "variant" && (
        <div className="p-3 rounded-md bg-gray-100 space-y-3">
          <div className="flex flex-col lg:flex-row justify-between items-center">
            <h3 className="font-semibold text-gray-700 text-left w-full mb-2 lg:mb-0">
              Varijante i cene
            </h3>
            <button
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  variants: [
                    ...(form.variants || []),
                    { name: "", price: 0, duration: 0, perItem: false },
                  ],
                })
              }
              className="cursor-pointer w-full lg:w-auto px-3 py-1 bg-(--primary-color) hover:bg-(--primary-color)/80 text-white rounded"
            >
              + Dodaj varijantu
            </button>
          </div>

          {form.variants?.length === 0 && (
            <p className="text-xs text-gray-500">Nema varijanti. Dodaj prvu.</p>
          )}

          {form.variants?.map((v, index) => (
            <div
              key={index}
              className="flex flex-col lg:flex-row gap-3 items-center bg-white p-2 rounded"
            >
              <input
                type="text"
                placeholder="Naziv (npr. Velicina 1)"
                value={v.name}
                onChange={(e) => {
                  const updated = [...form.variants!];
                  updated[index].name = e.target.value;
                  setForm({ ...form, variants: updated });
                }}
                className="flex-1 p-2 bg-gray-100 rounded border-gray-200"
              />

              <input
                type="number"
                placeholder="Cena"
                value={v.price}
                onChange={(e) => {
                  const updated = [...form.variants!];
                  updated[index].price = Number(e.target.value);
                  setForm({ ...form, variants: updated });
                }}
                className="lg:w-32 p-2 bg-gray-100 rounded border-gray-200"
              />

              <button
                type="button"
                onClick={() => {
                  const updated = form.variants!.filter((_, i) => i !== index);
                  setForm({ ...form, variants: updated });
                }}
                className="cursor-pointer size-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full"
              >
                X
              </button>
            </div>
          ))}
        </div>
      )}

      {/* PRICE + DURATION */}
      <div className="flex gap-x-3">
        {form.type !== "variant" && (
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700">
              Cena (RSD)
            </label>
            <input
              type="number"
              value={form.basePrice ?? 0}
              onChange={(e) =>
                setForm({
                  ...form,
                  basePrice: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
              className="mt-1 block w-full rounded-md border-gray-200 p-2 bg-gray-100"
            />
          </div>
        )}

        <div className="flex-1">
          <label className="block text-sm font-semibold text-gray-700">
            {form.type !== "variant" ? "Trajanje" : "Max Trajanje"} (min)
          </label>
          <input
            type="number"
            value={form.duration ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                duration: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="mt-1 block w-full rounded-md border-gray-200 p-2 bg-gray-100"
          />
        </div>
      </div>

      {/* SUBSCRIPTION TOGGLE */}
      <div className="flex gap-x-4 items-center border-gray-200 p-2 bg-gray-100">
        <input
          type="checkbox"
          checked={form.subscription.enabled}
          onChange={(e) =>
            setForm({
              ...form,
              subscription: {
                ...form.subscription,
                enabled: e.target.checked,
              },
            })
          }
        />
        <span className="text-sm font-semibold text-gray-600">
          Pretplata za ovu uslugu
        </span>
      </div>

      {/* SUBSCRIPTION INPUTS */}
      {form.subscription.enabled && (
        <div className="space-y-3">
          {/* TYPE DROPDOWN */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Vrsta pretplate
            </label>
            <select
              value={form.subscription.subscriptionType ?? "monthly"}
              onChange={(e) =>
                setForm({
                  ...form,
                  subscription: {
                    ...form.subscription,
                    subscriptionType: e.target.value as "monthly" | "package",
                    treatmentCount:
                      e.target.value === "monthly"
                        ? null
                        : form.subscription.treatmentCount,
                  },
                })
              }
              className="mt-1 block w-full rounded-md border-gray-200 bg-gray-100 p-2"
            >
              <option value="monthly">Mesečna pretplata</option>
              <option value="package">Paket tretmana</option>
            </select>
          </div>

          {/* TREATMENT COUNT — only for package */}
          {form.subscription.subscriptionType === "package" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Broj tretmana
              </label>
              <input
                type="number"
                min={1}
                value={form.subscription.treatmentCount ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    subscription: {
                      ...form.subscription,
                      treatmentCount: e.target.value
                        ? Number(e.target.value)
                        : null,
                    },
                  })
                }
                className="mt-1 block w-full rounded-md bg-gray-100 p-2"
              />
            </div>
          )}

          {/* PRICE + DATES */}
          <div className="flex flex-col lg:flex-row gap-x-3">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700">
                {form.subscription.subscriptionType === "package"
                  ? "Cena paketa (RSD)"
                  : "Mesečna cena (RSD)"}
              </label>
              <input
                type="number"
                value={form.subscription.priceMonthly ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    subscription: {
                      ...form.subscription,
                      priceMonthly: Number(e.target.value),
                    },
                  })
                }
                className="mt-1 block w-full rounded-md bg-gray-100 p-2"
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700">
                Od
              </label>
              <input
                type="date"
                value={form.subscription.startDate ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    subscription: {
                      ...form.subscription,
                      startDate: e.target.value,
                    },
                  })
                }
                className="mt-1 block w-full rounded-md bg-gray-100 p-2"
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700">
                Do
              </label>
              <input
                type="date"
                value={form.subscription.endDate ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    subscription: {
                      ...form.subscription,
                      endDate: e.target.value,
                    },
                  })
                }
                className="mt-1 block w-full rounded-md bg-gray-100 p-2"
              />
            </div>
          </div>
        </div>
      )}

      {/* HOMEPAGE POSITION */}
      <div>
        <label className="block text-xs lg:text-sm font-semibold text-gray-700">
          Pozicija na početnoj (maks 3 usluge)
        </label>
        <select
          value={form.featured ?? ""}
          onChange={(e) =>
            setForm({
              ...form,
              featured: (e.target.value || null) as HomePagePosition,
            })
          }
          className="mt-1 block w-full rounded-md border-gray-200 bg-gray-100 p-2"
        >
          <option value="none">Bez pozicije</option>
          <option value="main">Glavna kartica</option>
          <option value="second">Druga kartica</option>
          <option value="third">Treća kartica</option>
        </select>
      </div>

      {/* SHORT DESC */}
      <div>
        <label className="block text-xs lg:text-sm font-semibold text-gray-700">
          Kratak opis
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-200 p-2 bg-gray-100"
        />
      </div>

      {/* LIST ITEMS */}
      <div>
        <label className="block text-xs lg:text-sm font-semibold text-gray-700">
          Navedite šta usluga uključuje (svaka stavka u novom redu)
        </label>
        <textarea
          value={form.items.join("\n")}
          onChange={(e) =>
            setForm({ ...form, items: e.target.value.split("\n") })
          }
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-200 p-2 bg-gray-100"
        />
      </div>

      {/* BUTTONS */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
        >
          Otkaži
        </button>
        <button
          type="submit"
          className="cursor-pointer px-4 py-2 bg-(--secondary-color) text-white rounded hover:bg-(--secondary-color)/90 transition-colors disabled:opacity-50"
        >
          {editing ? "Sačuvaj" : "Kreiraj"}
        </button>
      </div>
    </form>
  );
}
