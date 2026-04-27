import { useState } from "react";
import { IService, IServiceInput } from "@/types";
import toast from "react-hot-toast";
import { useServiceMutations } from "@/hooks/useServiceMutations";

export function useAdminServiceForm() {
  const { createService, updateService } = useServiceMutations();

  const emptyForm: IServiceInput = {
    name: "",
    category: "",
    categorySlug: "",
    subcategory: "",
    basePrice: undefined,
    items: [],
    type: "single",
    description: "",
    duration: undefined,
    variants: [],
    extras: [],
    subscription: {
      enabled: false,
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
    featured: "none",
  };

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<IService | null>(null);
  const [form, setForm] = useState<IServiceInput>(emptyForm);

  /** 🔥 Nova inicijalizacija forme (samo za editovanje) */
  const initializeForm = (data: IService) => {
    const { ...rest } = data;

    setForm({
      ...rest,
      categorySlug: rest.categorySlug ?? "",
      basePrice: rest.basePrice ?? undefined,
      duration: rest.duration ?? undefined,
      items: rest.items || [],
      variants: rest.variants || [],
      extras: rest.extras || [],
      subscription: rest.subscription || {
        enabled: false,
        priceMonthly: null,
        startDate: "",
        endDate: "",
      },
    });
  };

  /** Ako se otvara kreiranje → prazna forma */
  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setIsOpen(true);
  }

  /** Ako se otvara edit → popuni putem initializeForm */
  function openEdit(service: IService) {
    setEditing(service);
    initializeForm(service);
    setIsOpen(true);
  }

  function resetForm() {
    if (editing) initializeForm(editing);
    else setForm(emptyForm);
  }

  const onClose = () => {
    setIsOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const save = async () => {
    try {
      const payload = { ...form, items: form.items.map((i) => i.trim()).filter(Boolean) };
      if (editing) {
        await updateService.mutateAsync({ id: editing._id!, payload });
        toast.success("Usluga uspešno izmenjena!");
      } else {
        await createService.mutateAsync(payload);
        toast.success("Usluga uspešno kreirana!");
      }
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Greška pri čuvanju usluge.");
    }
  };

  return {
    isOpen,
    setIsOpen,
    editing,
    form,
    setForm,
    save,
    resetForm,
    openCreate,
    openEdit,
  };
}
