/**
 * useSalonProfileAdmin — hook za admin upravljanje profilom salona.
 *
 * - Učitava profil iz DB i auto-popunjava formu (tenantId iz JWT)
 * - Kreiranje profila (POST) / Izmena (PUT) / Brisanje (DELETE)
 * - Radno vreme: multi-slot po danu (WorkingHoursMap)
 * - Logo: lokalni preview + upload na Cloudinary via FormData
 * - Strogo tipizirano prema ISalonProfileForm, WorkingHoursMap, ITimeSlot
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type {
  ISalonProfileForm,
  LandingTheme,
  SalonProfile,
  WorkingHoursMap,
  ITimeSlot,
  DayOfWeek,
  SeoData,
  IBranding,
  SocialLinks,
} from "@/types";
import { DAYS_OF_WEEK } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { normalizePhone } from "@/helpers/normalizePhone";
import { EMPTY_WORKING_HOURS } from "@/types/constants";

// ─── Defaults ─────────────────────────────────────────────────────────────────

const emptyWorkingHours = (): WorkingHoursMap => ({ ...EMPTY_WORKING_HOURS });

const emptyForm = (): ISalonProfileForm => ({
  name: "",
  email: "",
  description: "",
  phone: "",
  street: "",
  city: "",
  newsletterEmail: "",
  logo: null,
  social: { instagram: "", facebook: "", tiktok: "" },
  workingHours: emptyWorkingHours(),
  seo: {
    homeTitle: "",
    homeDescription: "",
    uslugeTitle: "",
    uslugeDescription: "",
    terminiTitle: "",
    terminiDescription: "",
  },
  branding: {
    primaryColor: "#a855f7",
    secondaryColor: "#ec4899",
    fontFamily: "Inter",
  },
  landingTheme: "theme-1" as LandingTheme,
});

// Mapira SalonProfile iz DB u formu — normalizuje legacy workingHours string format
export function mapProfileToForm(p: SalonProfile): ISalonProfileForm {
  const wh = emptyWorkingHours();

  if (p.workingHours) {
    const raw = p.workingHours as Record<string, unknown>;
    DAYS_OF_WEEK.forEach((day) => {
      const val = raw[day];
      if (
        Array.isArray(val) &&
        val.length > 0 &&
        "from" in (val[0] as object)
      ) {
        wh[day] = val as ITimeSlot[];
      } else if (typeof val === "string" && val.trim()) {
        // Legacy: "08:00-16:00"
        const m = val.match(/(\d{1,2}:\d{2})\s*[-–do]+\s*(\d{1,2}:\d{2})/i);
        if (m) wh[day] = [{ from: m[1], to: m[2] }];
      }
    });
  }

  const rawProfile = p as unknown as Record<string, unknown>;
  const landingTheme = (rawProfile.landingTheme as LandingTheme) || "theme-1";

  return {
    name: p.name ?? "",
    email: p.email ?? "",
    description: p.description ?? "",
    phone: p.phone ?? "",
    street: p.street ?? "",
    city: p.city ?? "",
    newsletterEmail: p.newsletterEmail ?? "",
    logo: p.logo ?? null,
    social: {
      instagram: p.social?.instagram ?? "",
      facebook: p.social?.facebook ?? "",
      tiktok: p.social?.tiktok ?? "",
    },
    workingHours: wh,
    seo: {
      homeTitle: p.seo?.homeTitle ?? "",
      homeDescription: p.seo?.homeDescription ?? "",
      uslugeTitle: p.seo?.uslugeTitle ?? "",
      uslugeDescription: p.seo?.uslugeDescription ?? "",
      terminiTitle: p.seo?.terminiTitle ?? "",
      terminiDescription: p.seo?.terminiDescription ?? "",
    },
    branding: {
      primaryColor: p.branding?.primaryColor ?? "#a855f7",
      secondaryColor: p.branding?.secondaryColor ?? "#ec4899",
      fontFamily: p.branding?.fontFamily ?? "Inter",
    },
    landingTheme: landingTheme,
  };
}

function validate(f: ISalonProfileForm): string | null {
  if (!f.name.trim()) return "Naziv salona je obavezan.";
  if (!f.phone.trim()) return "Telefon je obavezan.";
  return null;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiFetch(
  url: string,
  token: string,
): Promise<SalonProfile | null> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const j = await res.json();
  return j.data ?? null;
}

async function apiSave(
  fd: FormData,
  token: string,
  isCreate: boolean,
): Promise<SalonProfile> {
  const url = isCreate
    ? "/api/salon-profile/create"
    : "/api/salon-profile/update";
  const res = await fetch(url, {
    method: isCreate ? "POST" : "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error ?? "Greška pri snimanju");
  }
  const j = await res.json();
  return (j.data ?? j) as SalonProfile;
}

async function apiDelete(token: string): Promise<void> {
  const res = await fetch("/api/salon-profile/delete", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Greška pri brisanju");
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSalonProfileAdmin() {
  const { token } = useAuth();
  const qc = useQueryClient();

  const {
    data: profile,
    isLoading,
    error: fetchError,
  } = useQuery<SalonProfile | null>({
    queryKey: ["salonProfile"],
    queryFn: () => apiFetch("/api/salon-profile", token ?? ""),
    enabled: !!token,
    staleTime: 1000 * 60 * 3,
    refetchOnWindowFocus: false,
  });

  const [form, setForm] = useState<ISalonProfileForm>(emptyForm());
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm(mapProfileToForm(profile));
      setLogoPreview(profile.logo ?? null);
      setIsEditing(false);
    }
  }, [profile]);

  // ── Form handlers ─────────────────────────────────────────────────────────

  const setField = useCallback(
    <K extends keyof ISalonProfileForm>(k: K, v: ISalonProfileForm[K]) => {
      setForm((p) => ({ ...p, [k]: v }));
    },
    [],
  );

  const setSocialField = useCallback((k: keyof SocialLinks, v: string) => {
    setForm((p) => ({ ...p, social: { ...p.social, [k]: v } }));
  }, []);

  const setSeoField = useCallback((k: keyof SeoData, v: string) => {
    setForm((p) => ({ ...p, seo: { ...p.seo, [k]: v } }));
  }, []);

  const setBrandingField = useCallback((k: keyof IBranding, v: string) => {
    setForm((p) => ({ ...p, branding: { ...p.branding, [k]: v } }));
  }, []);

  // ── Working hours ─────────────────────────────────────────────────────────

  const addTimeSlot = useCallback((day: DayOfWeek) => {
    setForm((p) => ({
      ...p,
      workingHours: {
        ...p.workingHours,
        [day]: [...p.workingHours[day], { from: "08:00", to: "17:00" }],
      },
    }));
  }, []);

  const removeTimeSlot = useCallback((day: DayOfWeek, idx: number) => {
    setForm((p) => ({
      ...p,
      workingHours: {
        ...p.workingHours,
        [day]: p.workingHours[day].filter((_, i) => i !== idx),
      },
    }));
  }, []);

  const updateTimeSlot = useCallback(
    (day: DayOfWeek, idx: number, field: keyof ITimeSlot, val: string) => {
      setForm((p) => {
        const slots = [...p.workingHours[day]];
        slots[idx] = { ...slots[idx], [field]: val };
        return { ...p, workingHours: { ...p.workingHours, [day]: slots } };
      });
    },
    [],
  );

  const clearDay = useCallback((day: DayOfWeek) => {
    setForm((p) => ({ ...p, workingHours: { ...p.workingHours, [day]: [] } }));
  }, []);

  // ── Logo ──────────────────────────────────────────────────────────────────

  const handleLogoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Logo ne sme biti veći od 5MB");
        return;
      }
      setLogoFile(file);
      const r = new FileReader();
      r.onloadend = () => setLogoPreview(r.result as string);
      r.readAsDataURL(file);
    },
    [],
  );

  const removeLogo = useCallback(() => {
    setLogoFile(null);
    setLogoPreview(null);
    setForm((p) => ({ ...p, logo: null }));
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Niste prijavljeni");
      const err = validate(form);
      if (err) throw new Error(err);

      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("email", form.email.trim());
      fd.append("description", form.description);
      fd.append("phone", normalizePhone(form.phone));
      fd.append("street", form.street);
      fd.append("city", form.city);
      fd.append("newsletterEmail", form.newsletterEmail);
      fd.append("social", JSON.stringify(form.social));
      fd.append("workingHours", JSON.stringify(form.workingHours));
      fd.append("seo", JSON.stringify(form.seo));
      fd.append("branding", JSON.stringify(form.branding));
      fd.append("landingTheme", form.landingTheme);
      if (logoFile) fd.append("logo", logoFile);

      return apiSave(fd, token, !profile);
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ["salonProfile"] });
      setForm(mapProfileToForm(saved));
      setLogoPreview(saved.logo ?? null);
      setLogoFile(null);
      setIsEditing(false);
      toast.success(profile ? "Profil ažuriran!" : "Salon kreiran!");
    },
    onError: (e: Error) => toast.error(e.message || "Greška"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiDelete(token ?? ""),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salonProfile"] });
      setForm(emptyForm());
      setLogoPreview(null);
      setIsEditing(false);
      toast.success("Salon obrisan.");
    },
    onError: () => toast.error("Greška pri brisanju"),
  });

  const startEdit = useCallback(() => {
    if (profile) setForm(mapProfileToForm(profile));
    setIsEditing(true);
  }, [profile]);

  const cancelEdit = useCallback(() => {
    if (profile) {
      setForm(mapProfileToForm(profile));
      setLogoPreview(profile.logo ?? null);
    }
    setLogoFile(null);
    setIsEditing(false);
  }, [profile]);

  return {
    profile,
    isLoading,
    fetchError,
    form,
    setField,
    setSocialField,
    setSeoField,
    setBrandingField,
    isEditing,
    startEdit,
    cancelEdit,
    addTimeSlot,
    removeTimeSlot,
    updateTimeSlot,
    clearDay,
    logoFile,
    logoPreview,
    handleLogoChange,
    removeLogo,
    save: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    deleteProfile: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
