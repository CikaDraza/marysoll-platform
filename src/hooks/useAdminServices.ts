/**
 * useAdminServices — hook za admin upravljanje uslugama.
 *
 * - Učitava usluge filtrirane po tenantId (iz JWT)
 * - Create / Update / Delete sa optimistik UI
 * - Modal state (create | edit | closed)
 * - Strogo tipizirano: IService, IServiceInput, IServiceVariant, IServiceExtra, IServiceGroupItem
 */
"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type {
  IService,
  IServiceInput,
  IServiceVariant,
  IServiceExtra,
  IServiceGroupItem,
  IServiceSubscription,
} from "@/types";
import { useAuth } from "@/hooks/useAuth";

// ─── Defaults ─────────────────────────────────────────────────────────────────

const emptyServiceForm = (): IServiceInput => ({
  name: "",
  category: "",
  categorySlug: "",
  subcategory: "",
  type: "single",
  basePrice: undefined,
  priceMode: "fixed",
  duration: undefined,
  description: "",
  bookingIntake: { enabled: false },
  items: [],
  variants: [],
  extras: [],
  services: [],
  featured: "none",
  subscription: {
    enabled: false,
    subscriptionType: "monthly",
    treatmentCount: null,
    features: [],
    usage: {},
    featureOverrides: null,
    overrideExpiresAt: null,
    overrideNote: null,
    currentPeriodEnd: null,
    status: "trialing",
    priceMonthly: null,
    startDate: "",
    endDate: "",
  },
});

function mapServiceToForm(s: IService): IServiceInput {
  return {
    name: s.name ?? "",
    category: s.category ?? "",
    categorySlug: s.categorySlug ?? "",
    subcategory: s.subcategory ?? "",
    type: s.type ?? "single",
    basePrice: s.basePrice ?? undefined,
    priceMode: s.priceMode ?? "fixed",
    duration: s.duration ?? undefined,
    description: s.description ?? "",
    bookingIntake: { enabled: s.bookingIntake?.enabled === true },
    items: s.items ?? [],
    variants: s.variants ?? [],
    extras: s.extras ?? [],
    services: s.services ?? [],
    featured: s.featured ?? "none",
    subscription: s.subscription
      ? {
          ...s.subscription,
          subscriptionType: s.subscription.subscriptionType ?? "monthly",
          treatmentCount: s.subscription.treatmentCount ?? null,
        }
      : ({
          enabled: false,
          subscriptionType: "monthly",
          treatmentCount: null,
          priceMonthly: null,
          startDate: null,
          endDate: null,
        } as IServiceSubscription),
  };
}

function validateService(f: IServiceInput): string | null {
  if (!f.name.trim()) return "Naziv usluge je obavezan.";
  if (!f.categorySlug?.trim()) return "Kategorija je obavezna.";
  // Paket je jedna cena i jedno trajanje, isto kao jedna usluga — stavke
  // unutar njega su samo spisak onoga što je uključeno.
  if (f.type === "single" || f.type === "group") {
    if (f.priceMode !== "on_request" && (!f.basePrice || f.basePrice <= 0)) {
      return "Cena mora biti veća od 0.";
    }
    if (!f.duration || f.duration <= 0) return "Trajanje mora biti veće od 0.";
  }
  if (f.type === "variant") {
    if (!f.variants || f.variants.length === 0)
      return "Dodajte najmanje jednu varijantu.";
    // "od X" je obećanje klijentkinji — bez iznosa i bez najkraćeg trajanja
    // usluga ne može ni u cenovnik ni u booking.
    if (f.priceMode === "from") {
      if (!f.basePrice || f.basePrice <= 0)
        return "Unesite najnižu cenu — ona se prikazuje kao „od“.";
      if (!f.duration || f.duration <= 0)
        return "Unesite najkraće trajanje — ono rezerviše termin u kalendaru.";
      // Kod „Od“ varijanta nosi DOPLATU na osnovnu cenu, pa negativan iznos
      // ne bi bio doplata nego popust — to model ne podržava.
      const negative = f.variants.find(
        (v) => typeof v.additionalPrice === "number" && v.additionalPrice < 0,
      );
      if (negative)
        return `Doplata za „${negative.name || "varijantu"}“ ne može biti negativna.`;
    }
  }
  if (f.type === "group" && !f.services?.some((sv) => sv.name.trim()))
    return "Navedite šta paket sadrži — bar jednu uslugu.";
  return null;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchServices(token: string): Promise<IService[]> {
  const res = await fetch("/api/services", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Greška pri učitavanju usluga");
  return res.json();
}

async function createService(
  payload: IServiceInput,
  token: string,
): Promise<IService> {
  const res = await fetch("/api/services/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error ?? "Greška");
  }
  return res.json();
}

async function updateService(
  id: string,
  payload: IServiceInput,
  token: string,
): Promise<IService> {
  const res = await fetch(`/api/services/${id}/update`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error ?? "Greška");
  }
  return res.json();
}

async function deleteService(id: string, token: string): Promise<void> {
  const res = await fetch(`/api/services/${id}/delete`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Greška pri brisanju");
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export type ServiceModalMode = "closed" | "create" | "edit";

export function useAdminServices() {
  const { token } = useAuth();
  const qc = useQueryClient();

  const {
    data: services = [],
    isLoading,
    error,
  } = useQuery<IService[]>({
    queryKey: ["services"],
    queryFn: () => fetchServices(token ?? ""),
    enabled: !!token,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });

  const [modalMode, setModalMode] = useState<ServiceModalMode>("closed");
  const [editingService, setEditingService] = useState<IService | null>(null);
  const [form, setFormState] = useState<IServiceInput>(emptyServiceForm());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── Modal controls ────────────────────────────────────────────────────────

  const openCreate = useCallback(() => {
    setEditingService(null);
    setFormState(emptyServiceForm());
    setModalMode("create");
  }, []);

  const openEdit = useCallback((s: IService) => {
    setEditingService(s);
    setFormState(mapServiceToForm(s));
    setModalMode("edit");
  }, []);

  const closeModal = useCallback(() => {
    setModalMode("closed");
    setEditingService(null);
    setFormState(emptyServiceForm());
  }, []);

  // ── Field setters ─────────────────────────────────────────────────────────

  const setField = useCallback(
    <K extends keyof IServiceInput>(k: K, v: IServiceInput[K]) => {
      setFormState((p) => ({ ...p, [k]: v }));
    },
    [],
  );

  // Variants
  const addVariant = useCallback(() => {
    setFormState((p) => ({
      ...p,
      variants: [
        ...(p.variants ?? []),
        {
          name: "",
          price: 0,
          priceMode: "fixed",
          duration: 30,
          perItem: false,
        } as IServiceVariant,
      ],
    }));
  }, []);
  const updateVariant = useCallback(
    (
      i: number,
      k: keyof IServiceVariant,
      // `undefined` briše doplatu kad varijanta pređe na "cena na upit".
      v: string | number | boolean | undefined,
    ) => {
      setFormState((p) => {
        const a = [...(p.variants ?? [])];
        a[i] = { ...a[i], [k]: v };
        return { ...p, variants: a };
      });
    },
    [],
  );
  const removeVariant = useCallback((i: number) => {
    setFormState((p) => ({
      ...p,
      variants: (p.variants ?? []).filter((_, j) => j !== i),
    }));
  }, []);

  // Extras
  const addExtra = useCallback(() => {
    setFormState((p) => ({
      ...p,
      extras: [
        ...(p.extras ?? []),
        {
          name: "",
          price: 0,
          priceMode: "fixed",
          duration: 0,
          perItem: false,
        } as IServiceExtra,
      ],
    }));
  }, []);
  const updateExtra = useCallback(
    (i: number, k: keyof IServiceExtra, v: string | number | boolean) => {
      setFormState((p) => {
        const a = [...(p.extras ?? [])];
        a[i] = { ...a[i], [k]: v };
        return { ...p, extras: a };
      });
    },
    [],
  );
  const removeExtra = useCallback((i: number) => {
    setFormState((p) => ({
      ...p,
      extras: (p.extras ?? []).filter((_, j) => j !== i),
    }));
  }, []);

  // Group services
  const addGroupService = useCallback(() => {
    setFormState((p) => ({
      ...p,
      services: [
        ...(p.services ?? []),
        { name: "", description: "" } as IServiceGroupItem,
      ],
    }));
  }, []);
  const updateGroupService = useCallback(
    (i: number, k: keyof IServiceGroupItem, v: string | number) => {
      setFormState((p) => {
        const a = [...(p.services ?? [])];
        a[i] = { ...a[i], [k]: v };
        return { ...p, services: a };
      });
    },
    [],
  );
  const removeGroupService = useCallback((i: number) => {
    setFormState((p) => ({
      ...p,
      services: (p.services ?? []).filter((_, j) => j !== i),
    }));
  }, []);

  // Subscription
  const setSubscriptionField = useCallback(
    (k: keyof IServiceSubscription, v: boolean | number | string | null) => {
      setFormState((p) => ({
        ...p,
        subscription: { ...p.subscription, [k]: v },
      }));
    },
    [],
  );

  // ── Save mutation ─────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Niste prijavljeni");
      const err = validateService(form);
      if (err) throw new Error(err);
      const payload = { ...form, items: form.items.map((i) => i.trim()).filter(Boolean) };
      if (modalMode === "edit" && editingService)
        return updateService(editingService._id, payload, token);
      return createService(payload, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success(
        modalMode === "edit" ? "Usluga ažurirana!" : "Usluga kreirana!",
      );
      closeModal();
    },
    onError: (e: Error) => toast.error(e.message || "Greška"),
  });

  // ── Delete mutation ───────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteService(id, token ?? ""),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success("Usluga obrisana.");
      setDeleteConfirmId(null);
    },
    onError: () => toast.error("Greška pri brisanju."),
  });

  return {
    services,
    isLoading,
    error,
    modalMode,
    editingService,
    form,
    openCreate,
    openEdit,
    closeModal,
    setField,
    addVariant,
    updateVariant,
    removeVariant,
    addExtra,
    updateExtra,
    removeExtra,
    addGroupService,
    updateGroupService,
    removeGroupService,
    setSubscriptionField,
    save: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    deleteConfirmId,
    setDeleteConfirmId,
    confirmDelete: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
