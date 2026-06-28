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
  LandingStructure,
  LandingTheme,
  SalonProfile,
  WorkingHoursMap,
  ITimeSlot,
  DayOfWeek,
  SeoData,
  IBranding,
  SocialLinks,
  AvailabilityMode,
  ManualSlotsMap,
  IManualSlot,
  IVacation,
} from "@/types";
import { DAYS_OF_WEEK } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { normalizePhone } from "@/helpers/normalizePhone";
import { EMPTY_WORKING_HOURS } from "@/types/constants";
import { pruneAndValidateManualSlots } from "@/helpers/manualSlots";
import { normalizeVacations } from "@/helpers/vacations";

// ─── Defaults ─────────────────────────────────────────────────────────────────

const emptyWorkingHours = (): WorkingHoursMap => ({ ...EMPTY_WORKING_HOURS });

export const emptyLandingStructure = (): LandingStructure => ({
  landing: {
    hero: {
      enabled: true,
      headline: "",
      subheadline: "",
      whereWhatForWhom: "",
      contact: { location: "", phone: "" },
      socialLinks: { instagram: "", facebook: "", tiktok: "", whatsapp: "", telegram: "" },
      ctas: { primary: { text: "Zakaži termin", href: "/termini" } },
    },
    about: { enabled: true, headline: "", paragraphs: [], links: [] },
    artists: { enabled: false, headline: "", members: [] },
    servicesPreview: { enabled: true, headline: "", subheadline: "", showIcons: true },
    appointmentSection: {
      enabled: true,
      headline: "",
      subheadline: "",
      instructions: [],
    },
    stats: [],
    testimonials: { enabled: true, headline: "" },
    gallery: {
      enabled: true,
      headline: "",
      subheadline: "",
      instagram: { username: "", link: "", ctaText: "" },
      treatments: [],
    },
    faq: {
      enabled: true,
      headline: "",
      subheadline: "",
      support: { text: "", email: "" },
      items: [],
    },
  },
  pages: {
    servicesPage: { headline: "", subheadline: "", paragraph: "" },
    appointmentsPage: {
      headline: "",
      subheadline: "",
      paragraph: "",
      ctas: {
        primary: { text: "", href: "" },
        secondary: { text: "", href: "" },
      },
    },
  },
});

const emptyForm = (): ISalonProfileForm => ({
  name: "",
  email: "",
  description: "",
  phone: "",
  contactEmail: "",
  bookingEmail: "",
  marketingPhone: "",
  street: "",
  city: "",
  newsletterEmail: "",
  resendApiKey: "",
  logo: null,
  social: { instagram: "", facebook: "", tiktok: "", whatsapp: "", telegram: "" },
  workingHours: emptyWorkingHours(),
  vacations: [],
  availabilityMode: "workingHours",
  manualSlots: {},
  showWorkingHours: true,
  cancellationWindowHours: 1,
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
  landingStructure: emptyLandingStructure(),
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

  const empty = emptyLandingStructure();
  const rawLS = (rawProfile.landingStructure as LandingStructure | undefined) ?? {};
  const rawLanding = (rawLS as LandingStructure).landing ?? {};
  const rawPages = (rawLS as LandingStructure).pages ?? {};

  const landingStructure: LandingStructure = {
    landing: {
      hero: {
        enabled: rawLanding.hero?.enabled ?? true,
        headline: rawLanding.hero?.headline ?? "",
        subheadline: rawLanding.hero?.subheadline ?? "",
        whereWhatForWhom: rawLanding.hero?.whereWhatForWhom ?? "",
        image: rawLanding.hero?.image,
        images: rawLanding.hero?.images,
        contact: {
          location: rawLanding.hero?.contact?.location ?? "",
          phone: rawLanding.hero?.contact?.phone ?? "",
        },
        socialLinks: {
          instagram: rawLanding.hero?.socialLinks?.instagram ?? "",
          facebook: rawLanding.hero?.socialLinks?.facebook ?? "",
          tiktok: rawLanding.hero?.socialLinks?.tiktok ?? "",
          whatsapp: rawLanding.hero?.socialLinks?.whatsapp ?? "",
          telegram: rawLanding.hero?.socialLinks?.telegram ?? "",
        },
        ctas: {
          primary: {
            text: rawLanding.hero?.ctas?.primary?.text ?? "Zakaži termin",
            href: rawLanding.hero?.ctas?.primary?.href ?? "/termini",
          },
          secondary: rawLanding.hero?.ctas?.secondary
            ? { text: rawLanding.hero.ctas.secondary.text ?? "", href: rawLanding.hero.ctas.secondary.href ?? "" }
            : undefined,
        },
        // Theme-8 (Y2K) hero text overrides — passed through untouched.
        theme8: rawLanding.hero?.theme8,
      },
      about: {
        enabled: rawLanding.about?.enabled ?? true,
        headline: rawLanding.about?.headline ?? "",
        paragraphs: rawLanding.about?.paragraphs ?? [],
        links: rawLanding.about?.links ?? [],
        image: rawLanding.about?.image,
        images: rawLanding.about?.images,
        yearsOfExperience: rawLanding.about?.yearsOfExperience,
        openingYear: rawLanding.about?.openingYear,
      },
      artists: {
        enabled: rawLanding.artists?.enabled ?? false,
        headline: rawLanding.artists?.headline ?? "",
        members: rawLanding.artists?.members ?? [],
      },
      servicesPreview: {
        enabled: rawLanding.servicesPreview?.enabled ?? true,
        headline: rawLanding.servicesPreview?.headline ?? "",
        subheadline: rawLanding.servicesPreview?.subheadline ?? "",
        showIcons: rawLanding.servicesPreview?.showIcons ?? true,
        image: rawLanding.servicesPreview?.image,
      },
      appointmentSection: {
        enabled: rawLanding.appointmentSection?.enabled ?? true,
        headline: rawLanding.appointmentSection?.headline ?? "",
        subheadline: rawLanding.appointmentSection?.subheadline ?? "",
        instructions: rawLanding.appointmentSection?.instructions ?? [],
      },
      stats: rawLanding.stats ?? [],
      testimonials: {
        enabled: rawLanding.testimonials?.enabled ?? true,
        headline: rawLanding.testimonials?.headline ?? "",
      },
      gallery: {
        enabled: rawLanding.gallery?.enabled ?? true,
        headline: rawLanding.gallery?.headline ?? "",
        subheadline: rawLanding.gallery?.subheadline ?? "",
        instagram: {
          username: rawLanding.gallery?.instagram?.username ?? "",
          link: rawLanding.gallery?.instagram?.link ?? "",
          ctaText: rawLanding.gallery?.instagram?.ctaText ?? "",
        },
        treatments: rawLanding.gallery?.treatments ?? [],
        images: rawLanding.gallery?.images ?? [],
        variant: rawLanding.gallery?.variant,
        galleryVariant: rawLanding.gallery?.galleryVariant,
      },
      faq: {
        enabled: rawLanding.faq?.enabled ?? true,
        headline: rawLanding.faq?.headline ?? "",
        subheadline: rawLanding.faq?.subheadline ?? "",
        support: {
          text: rawLanding.faq?.support?.text ?? "",
          email: rawLanding.faq?.support?.email ?? "",
        },
        items: rawLanding.faq?.items ?? [],
      },
      blog: {
        enabled: rawLanding.blog?.enabled ?? false,
        headline: rawLanding.blog?.headline ?? "",
        paragraph: rawLanding.blog?.paragraph ?? "",
      },
    },
    pages: {
      servicesPage: {
        headline: rawPages.servicesPage?.headline ?? "",
        subheadline: rawPages.servicesPage?.subheadline ?? "",
        paragraph: rawPages.servicesPage?.paragraph ?? "",
      },
      appointmentsPage: {
        headline: rawPages.appointmentsPage?.headline ?? "",
        subheadline: rawPages.appointmentsPage?.subheadline ?? "",
        paragraph: rawPages.appointmentsPage?.paragraph ?? "",
        ctas: {
          primary: {
            text: rawPages.appointmentsPage?.ctas?.primary?.text ?? "",
            href: rawPages.appointmentsPage?.ctas?.primary?.href ?? "",
          },
          secondary: {
            text: rawPages.appointmentsPage?.ctas?.secondary?.text ?? "",
            href: rawPages.appointmentsPage?.ctas?.secondary?.href ?? "",
          },
        },
      },
    },
  };

  // suppress unused empty var warning
  void empty;

  return {
    name: p.name ?? "",
    email: p.email ?? "",
    description: p.description ?? "",
    phone: p.phone ?? "",
    contactEmail: p.contactEmail ?? "",
    bookingEmail: p.bookingEmail ?? "",
    marketingPhone: p.marketingPhone ?? "",
    street: p.street ?? "",
    city: p.city ?? "",
    newsletterEmail: p.newsletterEmail ?? "",
    resendApiKey: p.resendApiKey ?? "",
    logo: p.logo ?? null,
    social: {
      instagram: p.social?.instagram ?? "",
      facebook: p.social?.facebook ?? "",
      tiktok: p.social?.tiktok ?? "",
      whatsapp: p.social?.whatsapp ?? "",
      telegram: p.social?.telegram ?? "",
    },
    workingHours: wh,
    vacations: normalizeVacations(p.vacations),
    availabilityMode:
      p.availabilityMode === "manualSlots" ? "manualSlots" : "workingHours",
    // Pri učitavanju odseci prošle datume i sanitizuj — editor ne prikazuje stare termine.
    manualSlots: pruneAndValidateManualSlots(p.manualSlots),
    showWorkingHours: p.showWorkingHours !== false,
    cancellationWindowHours:
      typeof p.cancellationWindowHours === "number"
        ? p.cancellationWindowHours
        : 1,
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
    landingTheme,
    landingStructure,
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
    async function handleProfile() {
      if (profile) {
        setForm(mapProfileToForm(profile));
        setLogoPreview(profile.logo ?? null);
        setIsEditing(false);
      }
    }
    handleProfile();
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

  const setLandingStructure = useCallback((ls: LandingStructure) => {
    setForm((p) => ({ ...p, landingStructure: ls }));
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

  // ── Vacations (godišnji odmor) ──────────────────────────────────────────────

  const addVacation = useCallback(() => {
    setForm((p) => ({
      ...p,
      vacations: [...p.vacations, { from: "", to: "" }],
    }));
  }, []);

  const updateVacation = useCallback(
    (idx: number, field: keyof IVacation, val: string) => {
      setForm((p) => {
        const next = [...p.vacations];
        if (!next[idx]) return p;
        next[idx] = { ...next[idx], [field]: val };
        return { ...p, vacations: next };
      });
    },
    [],
  );

  const removeVacation = useCallback((idx: number) => {
    setForm((p) => ({
      ...p,
      vacations: p.vacations.filter((_, i) => i !== idx),
    }));
  }, []);

  // ── Manual slots (availabilityMode === "manualSlots") ───────────────────────

  const setAvailabilityMode = useCallback((mode: AvailabilityMode) => {
    setForm((p) => ({ ...p, availabilityMode: mode }));
  }, []);

  const setShowWorkingHours = useCallback((show: boolean) => {
    setForm((p) => ({ ...p, showWorkingHours: show }));
  }, []);

  const addManualSlot = useCallback((date: string) => {
    setForm((p) => {
      const day = p.manualSlots[date] ?? [];
      return {
        ...p,
        manualSlots: {
          ...p.manualSlots,
          [date]: [...day, { time: "09:00", duration: 60 }],
        },
      };
    });
  }, []);

  const updateManualSlot = useCallback(
    (
      date: string,
      idx: number,
      field: keyof IManualSlot,
      val: string | number,
    ) => {
      setForm((p) => {
        const day = [...(p.manualSlots[date] ?? [])];
        if (!day[idx]) return p;
        day[idx] = { ...day[idx], [field]: val };
        return { ...p, manualSlots: { ...p.manualSlots, [date]: day } };
      });
    },
    [],
  );

  const removeManualSlot = useCallback((date: string, idx: number) => {
    setForm((p) => {
      const day = (p.manualSlots[date] ?? []).filter((_, i) => i !== idx);
      const next: ManualSlotsMap = { ...p.manualSlots };
      if (day.length > 0) next[date] = day;
      else delete next[date];
      return { ...p, manualSlots: next };
    });
  }, []);

  const clearManualDay = useCallback((date: string) => {
    setForm((p) => {
      const next: ManualSlotsMap = { ...p.manualSlots };
      delete next[date];
      return { ...p, manualSlots: next };
    });
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
      fd.append("contactEmail", form.contactEmail);
      fd.append("bookingEmail", form.bookingEmail);
      fd.append("marketingPhone", form.marketingPhone);
      fd.append("resendApiKey", form.resendApiKey);
      fd.append("social", JSON.stringify(form.social));
      fd.append("workingHours", JSON.stringify(form.workingHours));
      fd.append("vacations", JSON.stringify(normalizeVacations(form.vacations)));
      fd.append("availabilityMode", form.availabilityMode);
      fd.append("showWorkingHours", String(form.showWorkingHours));
      fd.append(
        "manualSlots",
        JSON.stringify(pruneAndValidateManualSlots(form.manualSlots)),
      );
      fd.append(
        "cancellationWindowHours",
        String(
          Number.isInteger(form.cancellationWindowHours)
            ? form.cancellationWindowHours
            : 1,
        ),
      );
      fd.append("seo", JSON.stringify(form.seo));
      fd.append("branding", JSON.stringify(form.branding));
      fd.append("landingTheme", form.landingTheme);
      fd.append("landingStructure", JSON.stringify(form.landingStructure));
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
    setLandingStructure,
    isEditing,
    startEdit,
    cancelEdit,
    addTimeSlot,
    removeTimeSlot,
    updateTimeSlot,
    clearDay,
    addVacation,
    updateVacation,
    removeVacation,
    setAvailabilityMode,
    setShowWorkingHours,
    addManualSlot,
    updateManualSlot,
    removeManualSlot,
    clearManualDay,
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
