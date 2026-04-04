import { startTransition, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { SalonProfile } from "@/types";
import {
  useCreateSalonProfile,
  useUpdateSalonProfile,
  useDeleteSalonFields,
} from "@/hooks/useSalonMutations";
import { useAuth } from "@/hooks/useAuth";
import { normalizePhone } from "@/helpers/normalizePhone";

type WorkingHours = Record<
  | "Ponedeljak"
  | "Utorak"
  | "Sreda"
  | "Četvrtak"
  | "Petak"
  | "Subota"
  | "Nedelja",
  string
>;

const defaultWorkingHours: WorkingHours = {
  Ponedeljak: "",
  Utorak: "",
  Sreda: "",
  Četvrtak: "",
  Petak: "",
  Subota: "",
  Nedelja: "",
};

const defaultForm = (): Partial<SalonProfile> => ({
  name: "",
  logo: undefined,
  email: "",
  phone: "",
  description: "",
  street: "",
  city: "",
  newsletterEmail: "",
  contactEmail: "",
  social: {
    instagram: "",
    facebook: "",
    tiktok: "",
  },
  workingHours: { ...defaultWorkingHours },
});

export function mapInitialSalonToForm(s: SalonProfile): Partial<SalonProfile> {
  return {
    name: s.name ?? "",
    email: s.email ?? "",
    phone: s.phone ?? "",
    description: s.description ?? "",
    street: s.street ?? "",
    city: s.city ?? "",
    logo: s.logo ?? undefined,
    newsletterEmail: s.newsletterEmail ?? "",
    contactEmail: s.contactEmail ?? "",
    social: {
      instagram: s.social?.instagram ?? "",
      facebook: s.social?.facebook ?? "",
      tiktok: s.social?.tiktok ?? "",
    },
    workingHours:
      typeof s.workingHours === "string"
        ? JSON.parse(s.workingHours)
        : s.workingHours,
  };
}

export function useSalonProfileForm(initialSalon?: SalonProfile) {
  const { token } = useAuth();

  const createMutation = useCreateSalonProfile(token ?? undefined);
  const updateMutation = useUpdateSalonProfile(token ?? undefined);
  const deleteFieldsMutation = useDeleteSalonFields(token ?? undefined);

  const [isOpen, setIsOpen] = useState<boolean>(!!initialSalon);
  const [form, setForm] = useState<Partial<SalonProfile>>(
    initialSalon ? mapInitialSalonToForm(initialSalon) : defaultForm(),
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    form.logo || null,
  );

  useEffect(() => {
    if (!initialSalon) return;

    const timer = setTimeout(() => {
      startTransition(() => {
        const mapped = mapInitialSalonToForm(initialSalon);
        setForm(mapped);
        setLogoPreview(initialSalon.logo ?? null);
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [initialSalon]);

  /** Validacija */
  function validate() {
    if (!form.name?.trim()) return "Naziv je obavezan.";
    if (!form.email?.trim()) return "Email je obavezan.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) return "Unesite ispravan email format.";
    if (!form.phone?.trim()) return "Telefon je obavezan.";
    const phoneRegex = /^[0-9+]{7,20}$/;
    if (!phoneRegex.test(form.phone))
      return "Telefon mora da sadrži samo cifre i bude dužine 7–20 karaktera.";
    if (!form.street?.trim()) return "Ulica je obavezna.";
    if (!form.city?.trim()) return "Grad je obavezan.";
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoFile(file);

    // postavi preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  /** Brisanje logotipa */
  const removeLogo = async () => {
    try {
      await deleteFieldsMutation.mutateAsync(["logo"]);
      setForm((prev) => ({ ...prev, logo: undefined }));
      setLogoFile(null);
      toast.success("Logo obrisan.");
    } catch {
      toast.error("Greška pri brisanju logotipa.");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    if (name.startsWith("workingHours.")) {
      const day = name.split(".")[1] as keyof WorkingHours;
      setForm((prev) => ({
        ...prev,
        workingHours: { ...prev.workingHours, [day]: value },
      }));
      return;
    }

    if (name.startsWith("social.")) {
      const key = name.split(".")[1];
      setForm((prev) => ({
        ...prev,
        social: { ...prev.social, [key]: value },
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openCreate = () => {
    setForm(defaultForm());
    setIsOpen(true);
  };

  /** Kreiranje / Ažuriranje */
  const save = async (e: React.SubmitEvent) => {
    e.preventDefault();

    const validation = validate();
    if (validation) {
      toast.error(validation);
      return;
    }

    const normalizedPhone = normalizePhone(form.phone || "");

    const fd = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (key === "workingHours") {
        fd.append("workingHours", JSON.stringify(value));
      } else if (key === "social") {
        fd.append("social", JSON.stringify(value));
      } else if (value !== undefined && value !== null) {
        if (key === "phone") {
          fd.append("phone", normalizedPhone);
        } else {
          fd.append(key, value as string);
        }
      }
    });

    if (logoFile) fd.append("logo", logoFile);

    try {
      if (initialSalon) {
        await updateMutation.mutateAsync(fd);
      } else {
        await createMutation.mutateAsync(fd);
      }

      setIsOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  /** Brisanje specifičnog polja */
  const handleDeleteField = async (field: keyof SalonProfile) => {
    try {
      await deleteFieldsMutation.mutateAsync([field]);
      setForm((prev) => ({ ...prev, [field]: undefined }));
    } catch (err) {
      console.error(err);
    }
  };

  return {
    isOpen,
    openCreate,
    form,
    handleChange,
    save,
    handleDeleteField,
    handleFileChange,
    logoFile,
    removeLogo,
    setLogoFile,
    logoPreview,
    setLogoPreview,
  };
}
