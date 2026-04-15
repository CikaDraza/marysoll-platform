"use client";

import { useEffect, useState } from "react";
import { PhotoIcon } from "@heroicons/react/24/outline";
import { useSalonProfileForm } from "@/hooks/useSalonProfileForm";
import { useSalonProfile } from "@/hooks/useSalonProfile";
import toast from "react-hot-toast";
import Image from "next/image";
import { useUpdateSalonSeo } from "@/hooks/useSalonSeoMutations";
import LoaderButton from "../elements/LoaderButton";
import NotificationSettings from "../settings/NotificationSettings";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export default function AdminSalonProfile() {
  const { user } = useAuth();
  const isOwner = user?.globalRole === "OWNER";
  const { data: salonProfile, isLoading } = useSalonProfile();

  const {
    isOpen,
    openCreate,
    form,
    handleChange,
    save,
    logoFile,
    handleFileChange,
    setLogoFile,
    logoPreview,
    setLogoPreview,
  } = useSalonProfileForm(salonProfile ?? undefined);
  const updateSeo = useUpdateSalonSeo();

  const [seoForm, setSeoForm] = useState({
    homeTitle: salonProfile?.seo?.homeTitle || "",
    homeDescription: salonProfile?.seo?.homeDescription || "",
    uslugeTitle: salonProfile?.seo?.uslugeTitle || "",
    uslugeDescription: salonProfile?.seo?.uslugeDescription || "",
    terminiTitle: salonProfile?.seo?.terminiTitle || "",
    terminiDescription: salonProfile?.seo?.terminiDescription || "",
  });

  const handleSeoSave = async () => {
    try {
      await updateSeo.mutateAsync(seoForm);
    } catch (err) {
      console.error("SEO save failed:", err);
    }
  };

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Change password state ──────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwLoading, setPwLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error("Nove lozinke se ne poklapaju.");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      toast.error("Nova lozinka mora imati najmanje 8 karaktera.");
      return;
    }
    setPwLoading(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success("Lozinka uspešno promenjena.");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Greška pri promeni lozinke.";
      toast.error(msg);
    } finally {
      setPwLoading(false);
    }
  };

  /** Validacija forme */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name) newErrors.name = "Naziv salona je obavezan.";
    if (!form.email) newErrors.email = "Email je obavezan.";
    if (!form.phone) newErrors.phone = "Telefon je obavezan.";
    if (!form.description) newErrors.description = "Opis je obavezan.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /** Override save da validira pre submit-a */
  const handleSave = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Molimo popunite obavezna polja.");
      return;
    }
    await save(e);
  };

  useEffect(() => {
    if (salonProfile) {
      openCreate();
    }
  }, [salonProfile, openCreate]);

  if (isLoading)
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-(--secondary-color) mx-auto"></div>
          <p className="mt-4 text-gray-600">Učitavam podatke salona...</p>
        </div>
      </div>
    );

  return (
    <div className="isolate py-24 sm:py-32 px-1 lg:px-8">

      {/* Header */}
      <div className="mx-auto text-left">
        <h2 className="text-4xl! font-semibold tracking-tight text-gray-900">
          {salonProfile ? `${salonProfile?.name || ""} Salon` : "Kreiraj Salon"}
        </h2>
        <p className="mt-2 text-lg/8 text-gray-600">
          Informacije o vašem salonu. Ove informacije će se prikazati na sajtu.
        </p>
      </div>

      {!salonProfile && !isOpen && (
        <div className="mt-8 flex flex-col lg:flex-row justify-between items-center">
          <p className="text-gray-600">Salon nije kreiran</p>
          <button
            className="mt-2 lg:mt-0 px-4 py-2 rounded-lg font-semibold text-sm bg-(--secondary-color) hover:bg-(--secondary-color)/80 text-white cursor-pointer"
            onClick={openCreate}
          >
            Kreiraj salon
          </button>
        </div>
      )}

      {isOpen && (
        <form
          className="mx-auto mt-16 sm:mt-20 space-y-12"
          onSubmit={handleSave}
        >
          {/* OSNOVNE INFORMACIJE */}
          <div className="border-b border-gray-900/10 pb-12">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-semibold text-gray-900">
                Osnovne informacije
              </h3>
              <div>
                {!logoPreview ? (
                  <>
                    <label className="block text-sm/6 font-medium text-gray-600">
                      Logo salona
                    </label>
                    <PhotoIcon
                      aria-hidden="true"
                      className="size-24 text-gray-300"
                    />
                  </>
                ) : (
                  <Image
                    src={logoPreview!}
                    width={128}
                    height={128}
                    alt="Logo preview"
                    className="w-32 h-32 object-contain rounded-md border"
                  />
                )}
              </div>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              {/* Naziv */}
              <div className="sm:col-span-4">
                <label className="block text-sm/6 font-medium text-gray-900">
                  Naziv salona
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name || ""}
                  onChange={handleChange}
                  className={`block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-(--secondary-color) ${
                    errors.name ? "border-red-500" : ""
                  }`}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm">{errors.name}</p>
                )}
              </div>

              {/* Logo */}
              <div className="sm:col-span-2">
                <label className="block text-sm/6 font-medium text-gray-900">
                  Izaberi logo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full rounded-md px-8 py-2 bg-(--secondary-color) hover:bg-(--secondary-color)/80 text-white cursor-pointer"
                />
                {logoFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoFile(null);
                      setLogoPreview(null);
                    }}
                    className="text-red-600 hover:text-red-500 text-sm underline ml-3 cursor-pointer"
                  >
                    Ukloni izabrani fajl
                  </button>
                )}
              </div>

              {/* Email */}
              <div className="sm:col-span-3">
                <label className="block text-sm/6 font-medium text-gray-900">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email || ""}
                  onChange={handleChange}
                  className={`block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-(--secondary-color) ${
                    errors.email ? "border-red-500" : ""
                  }`}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm">{errors.email}</p>
                )}
              </div>

              {/* Telefon */}
              <div className="sm:col-span-3">
                <label className="block text-sm/6 font-medium text-gray-900">
                  Telefon
                </label>
                <input
                  type="text"
                  name="phone"
                  value={form.phone || ""}
                  onChange={handleChange}
                  placeholder="+381 62 201 787"
                  className={`block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-(--secondary-color) ${
                    errors.phone ? "border-red-500" : ""
                  }`}
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm">{errors.phone}</p>
                )}
              </div>

              {/* Opis */}
              <div className="col-span-full">
                <label className="block text-sm/6 font-medium text-gray-900">
                  Kratki opis
                </label>
                <textarea
                  rows={3}
                  name="description"
                  value={form.description || ""}
                  onChange={handleChange}
                  className={`block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-(--secondary-color) ${
                    errors.description ? "border-red-500" : ""
                  }`}
                  placeholder="Napišite nekoliko rečenica o salonu..."
                />
                {errors.description && (
                  <p className="text-red-500 text-sm">{errors.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Lokacija */}
          <div className="border-b border-gray-900/10 pb-12">
            <h3 className="text-2xl font-semibold text-gray-900">Lokacija</h3>
            <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <label className="block text-sm/6 font-medium text-gray-900">
                  Ulica i broj
                </label>
                <input
                  type="text"
                  name="street"
                  value={form.street || ""}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-md bg-white px-3 py-2 outline-1 outline-gray-300"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm/6 font-medium text-gray-900">
                  Grad
                </label>
                <input
                  type="text"
                  name="city"
                  value={form.city || ""}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-md bg-white px-3 py-2 outline-1 outline-gray-300"
                />
              </div>
            </div>
          </div>

          {/* Email Promocija + Marketing telefon — OWNER only */}
          {isOwner && (
            <div className="border-b border-gray-900/10 pb-12">
              <h3 className="text-2xl font-semibold text-gray-900">
                Email Promocija
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Email adrese koje se koriste za newsletter kampanje i kontakt.
              </p>
              <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label className="block text-sm/6 font-medium text-gray-900">
                    Newsletter email
                  </label>
                  <p className="text-xs text-gray-500 mb-1">
                    Adresa sa koje se šalju newsletter kampanje.
                  </p>
                  <input
                    type="email"
                    name="newsletterEmail"
                    value={form.newsletterEmail || ""}
                    onChange={handleChange}
                    placeholder="newsletter@vašsalon.com"
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-(--secondary-color)"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-sm/6 font-medium text-gray-900">
                    Kontakt email
                  </label>
                  <p className="text-xs text-gray-500 mb-1">
                    Adresa za klijentske upite i kontakt obrazac.
                  </p>
                  <input
                    type="email"
                    name="contactEmail"
                    value={
                      (form as { contactEmail?: string }).contactEmail || ""
                    }
                    onChange={handleChange}
                    placeholder="kontakt@vašsalon.com"
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-(--secondary-color)"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-sm/6 font-medium text-gray-900">
                    Marketing telefon
                  </label>
                  <p className="text-xs text-gray-500 mb-1">
                    Broj koji se prikazuje u marketinškim materijalima.
                  </p>
                  <input
                    type="tel"
                    name="marketingPhone"
                    value={
                      (form as { marketingPhone?: string }).marketingPhone || ""
                    }
                    onChange={handleChange}
                    placeholder="+381 60 000 0000"
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-(--secondary-color)"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SOCIJALNE MREŽE */}
          <div className="border-b border-gray-900/10 pb-12">
            <h3 className="text-2xl font-semibold text-gray-900">
              Socijalne mreže
            </h3>

            <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-3">
              {Object.keys(form.social || {}).map((key) => (
                <div key={key}>
                  <label className="block text-sm/6 font-medium text-gray-900">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </label>

                  <input
                    type="text"
                    name={`social.${key}`}
                    value={form.social?.[key as keyof typeof form.social] || ""}
                    onChange={handleChange}
                    placeholder={`Link za ${key}`}
                    className="mt-2 block w-full rounded-md bg-white px-3 py-2 outline-1 outline-gray-300 placeholder:text-gray-400"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Radno vreme */}
          <div className="border-b border-gray-900/10 pb-12">
            <h3 className="text-2xl font-semibold text-gray-900">
              Radno vreme
            </h3>
            <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-3">
              {Object.keys(form.workingHours || {}).map((day) => (
                <div key={day}>
                  <label className="block text-sm/6 font-medium text-gray-900">
                    {day}
                  </label>
                  <input
                    type="text"
                    name={`workingHours.${day}`}
                    value={
                      (form.workingHours?.[
                        day as keyof typeof form.workingHours
                      ] as string) || ""
                    }
                    onChange={handleChange}
                    placeholder="npr. 09:00 - 17:00"
                    className="mt-2 block w-full rounded-md bg-white px-3 py-2 outline-1 outline-gray-300 placeholder:text-gray-400"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Save & Delete */}
          <div className="pt-10 flex justify-end gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="block w-auto rounded-md bg-(--secondary-color) px-6 py-3 text-center text-sm font-semibold text-white shadow-xs hover:bg-(--secondary-color)/90 cursor-pointer"
            >
              {isLoading ? <LoaderButton /> : "Sačuvaj osnovne info"}
            </button>
          </div>
        </form>
      )}

      {/* PROMENA LOZINKE */}
      <div className="pt-12 mt-12 border-t border-gray-200">
        <h3 className="text-2xl font-semibold text-gray-900 mb-1">
          Promena lozinke
        </h3>
        <p className="text-sm text-gray-500 mb-8">
          Unesite trenutnu lozinku i novu lozinku da biste je promenili.
        </p>
        <form onSubmit={handlePasswordChange} className="max-w-lg space-y-5">
          <div>
            <label className="block text-sm/6 font-medium text-gray-900">
              Trenutna lozinka
            </label>
            <input
              type="password"
              value={pwForm.currentPassword}
              onChange={(e) =>
                setPwForm((p) => ({ ...p, currentPassword: e.target.value }))
              }
              autoComplete="current-password"
              className="mt-1 block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 outline-gray-300 focus:outline-(--secondary-color)"
            />
          </div>
          <div>
            <label className="block text-sm/6 font-medium text-gray-900">
              Nova lozinka
            </label>
            <input
              type="password"
              value={pwForm.newPassword}
              onChange={(e) =>
                setPwForm((p) => ({ ...p, newPassword: e.target.value }))
              }
              autoComplete="new-password"
              placeholder="Najmanje 8 karaktera"
              className="mt-1 block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 outline-gray-300 focus:outline-(--secondary-color) placeholder:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm/6 font-medium text-gray-900">
              Potvrdite novu lozinku
            </label>
            <input
              type="password"
              value={pwForm.confirmPassword}
              onChange={(e) =>
                setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))
              }
              autoComplete="new-password"
              className="mt-1 block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 outline-gray-300 focus:outline-(--secondary-color)"
            />
            {pwForm.confirmPassword &&
              pwForm.newPassword !== pwForm.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">
                  Lozinke se ne poklapaju.
                </p>
              )}
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={pwLoading}
              className="px-6 py-2.5 rounded-md bg-(--secondary-color) text-white text-sm font-semibold hover:bg-(--secondary-color)/90 disabled:opacity-60 cursor-pointer"
            >
              {pwLoading ? "Menjam lozinku..." : "Promeni lozinku"}
            </button>
          </div>
        </form>
      </div>

      {/* SEO & META PODACI */}
      <div className="pt-12 mt-12">
        <h3 className="text-2xl font-semibold text-gray-900 mb-4">
          SEO & Meta podaci
        </h3>
        <p className="text-sm text-gray-600 mb-8">
          Ovi podaci se prikazuju u Google pretrazi i na društvenim mrežama.
        </p>

        <div className="p-8 space-y-10">
          {/* Početna stranica */}
          <div className="border-b border-gray-900/10 pb-12">
            <h4 className="text-lg font-medium text-gray-800 mb-4">
              Početna stranica
            </h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  Title <span className="text-gray-500">(do 60)</span>
                </label>
                <input
                  type="text"
                  value={seoForm.homeTitle}
                  onChange={(e) =>
                    setSeoForm({ ...seoForm, homeTitle: e.target.value })
                  }
                  maxLength={70}
                  className="mt-1 block w-full rounded-md bg-gray-100 px-3 py-2"
                  placeholder="MarySoll Makeup & Nails | Bor"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {seoForm.homeTitle.length}/60
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  Description <span className="text-gray-500">(do 160)</span>
                </label>
                <textarea
                  rows={3}
                  value={seoForm.homeDescription}
                  onChange={(e) =>
                    setSeoForm({ ...seoForm, homeDescription: e.target.value })
                  }
                  maxLength={170}
                  className="mt-1 block w-full rounded-md bg-gray-100 px-3 py-2"
                  placeholder="Profesionalna šminka, manikir i pedikir u Boru..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  {seoForm.homeDescription.length}/160
                </p>
              </div>
            </div>
          </div>

          {/* Usluge */}
          <div className="pt-8 border-b border-gray-900/10 pb-12">
            <h4 className="text-lg font-medium text-gray-800 mb-4">
              Stranica Usluge
            </h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  Title <span className="text-gray-500">(do 60)</span>
                </label>
                <input
                  type="text"
                  value={seoForm.uslugeTitle}
                  onChange={(e) =>
                    setSeoForm({ ...seoForm, uslugeTitle: e.target.value })
                  }
                  maxLength={70}
                  className="block w-full rounded-md bg-gray-100 px-3 py-2"
                  placeholder="Usluge | MarySoll Salon Bor"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {seoForm.uslugeTitle.length}/60
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  Description <span className="text-gray-500">(do 160)</span>
                </label>
                <textarea
                  rows={2}
                  value={seoForm.uslugeDescription}
                  onChange={(e) =>
                    setSeoForm({
                      ...seoForm,
                      uslugeDescription: e.target.value,
                    })
                  }
                  maxLength={170}
                  className="block w-full rounded-md bg-gray-100 px-3 py-2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {seoForm.uslugeDescription.length}/160
                </p>
              </div>
            </div>
          </div>

          {/* Termini */}
          <div className="pt-8 border-b border-gray-900/10 pb-12">
            <h4 className="text-lg font-medium text-gray-800 mb-4">
              Stranica Termini
            </h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  Title <span className="text-gray-500">(do 60)</span>
                </label>
                <input
                  type="text"
                  value={seoForm.terminiTitle}
                  onChange={(e) =>
                    setSeoForm({ ...seoForm, terminiTitle: e.target.value })
                  }
                  maxLength={70}
                  className="block w-full rounded-md bg-gray-100 px-3 py-2"
                  placeholder="Zakaži termin | MarySoll Salon"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {seoForm.terminiTitle.length}/60
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  Description <span className="text-gray-500">(do 160)</span>
                </label>
                <textarea
                  rows={2}
                  value={seoForm.terminiDescription}
                  onChange={(e) =>
                    setSeoForm({
                      ...seoForm,
                      terminiDescription: e.target.value,
                    })
                  }
                  maxLength={170}
                  className="block w-full rounded-md bg-gray-100 px-3 py-2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {seoForm.terminiDescription.length}/160
                </p>
              </div>
            </div>
          </div>

          {/* Dugme za čuvanje SEO */}
          <div className="pt-8 flex justify-end">
            <button
              onClick={handleSeoSave}
              disabled={updateSeo.isPending}
              className="px-6 py-3 bg-(--secondary-color) hover:bg-(--secondary-color)/90 cursor-pointer disabled:bg-(--primary-color) text-white font-medium rounded-lg shadow-sm transition"
            >
              {updateSeo.isPending ? (
                <>Čuvam SEO...</>
              ) : (
                <>Sačuvaj SEO podatke</>
              )}
            </button>
          </div>
          {/* Notifikacije */}
          <NotificationSettings />
        </div>
      </div>
    </div>
  );
}
