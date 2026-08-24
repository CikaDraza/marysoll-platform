"use client";
/**
 * ProfilTab — izdvojen iz app/dashboard/page.tsx (Faza 4c).
 * Sav state/handleri žive u AdminDashboard i stižu kroz DashboardTabProps.
 */
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { useState, type RefObject } from "react";
import { card, inp, lbl, themePickerThemesForTenant } from "./shared";
import type { DashboardTabProps } from "./types";
import { PasswordVisibilityButton } from "@/components/auth/PasswordVisibilityButton";

/**
 * Jedno polje za logo (sajt / notifikacije). Dva ovakva stoje jedno pored
 * drugog u jednom redu, pa su akcije ikonice (olovka / kanta) umesto punih
 * dugmadi koje su ranije trošile celu kolonu po visini.
 */
function LogoField({
  label,
  alt,
  placeholder,
  preview,
  inputRef,
  accept,
  onChange,
  onRemove,
  hint,
  priority,
}: {
  label: string;
  alt: string;
  placeholder: string;
  preview: string | null | undefined;
  inputRef: RefObject<HTMLInputElement | null>;
  accept: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  hint: string;
  priority?: boolean;
}) {
  return (
    // subgrid: labela / pregled / akcije / napomena se poravnavaju sa susednim
    // poljem, bez obzira na to koliko redova zauzme tekst.
    <div className="grid grid-rows-subgrid row-span-4 justify-items-center gap-3">
      <p className={lbl + " w-full self-start"}>{label}</p>
      <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
        {preview ? (
          <Image
            src={preview}
            alt={alt}
            width={96}
            height={96}
            priority={priority}
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="text-4xl">{placeholder}</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onChange}
      />
      {preview ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            title="Promeni logo"
            aria-label="Promeni logo"
            className="w-9 h-9 flex items-center justify-center bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            title="Ukloni logo"
            aria-label="Ukloni logo"
            className="w-9 h-9 flex items-center justify-center border border-red-200 dark:border-red-800 text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition"
        >
          <PlusIcon className="w-4 h-4" />
          Dodaj logo
        </button>
      )}
      <p className="text-[11px] text-gray-400 text-center">{hint}</p>
    </div>
  );
}



export function ProfilTab(props: DashboardTabProps) {
  const [showPasswords, setShowPasswords] = useState(false);
  const [showResendApiKey, setShowResendApiKey] = useState(false);
  const {
    deleteSalonInput,
    fileRef,
    handleDeleteSalon,
    handlePasswordChange,
    handleSaveWithAccount,
    hasProfile,
    identityForm,
    identityOpen,
    isDeletingSalon,
    isOwner,
    isUpdatingIdentity,
    notifLogoRef,
    pwError,
    pwForm,
    pwLoading,
    setDeleteSalonInput,
    setIdentityForm,
    setIdentityOpen,
    setPwForm,
    setShowDeleteSalon,
    showDeleteSalon,
    sp,
    tenant,
    updateIdentity,
    user,
  } = props;

  return (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Logo + branding */}
      <div
        className={
          card + " lg:col-span-1 flex flex-col items-center gap-4"
        }
      >
        {/* Oba loga u jednom redu — po pola širine kolone */}
        <div className="w-full grid grid-cols-2 grid-rows-[auto_auto_auto_auto] gap-x-4 gap-y-3">
          <LogoField
            label="Logo sajta (i favicon)"
            alt="Logo"
            placeholder="🏪"
            preview={sp.logoPreview}
            inputRef={fileRef}
            accept="image/*"
            onChange={sp.handleLogoChange}
            onRemove={sp.removeLogo}
            hint="PNG · JPG · WebP · Maks. 5 MB"
          />
          <LogoField
            label="Logo za notifikacije i mejlove"
            alt="Logo za notifikacije"
            placeholder="🔔"
            preview={sp.notificationLogoPreview}
            inputRef={notifLogoRef}
            accept="image/png,image/jpeg,image/webp"
            onChange={sp.handleNotificationLogoChange}
            onRemove={sp.removeNotificationLogo}
            hint="Mejlovi i push notifikacije. PNG · JPG · WebP (bez SVG). Ako se ne postavi, koristi se Marysoll logo."
            priority
          />
        </div>

        {/* Branding colors */}
        <div className="w-full border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
          <p className={lbl}>Branding boje</p>
          {(["primaryColor", "secondaryColor"] as const).map((k) => (
            <label
              key={k}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <input
                type="color"
                value={sp.form.branding[k]}
                onChange={(e) => sp.setBrandingField(k, e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 dark:border-gray-700 p-0.5"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {k === "primaryColor" ? "Primarna" : "Sekundarna"}
              </span>
            </label>
          ))}
          <div>
            <label className={lbl + " mt-2"}>Font</label>
            <select
              className={inp}
              value={sp.form.branding.fontFamily}
              onChange={(e) =>
                sp.setBrandingField("fontFamily", e.target.value)
              }
            >
              {[
                "Inter",
                "Poppins",
                "Lato",
                "Montserrat",
                "Playfair Display",
                "DM Sans",
                "Nunito",
              ].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Theme picker */}
        <div className="w-full border-t border-gray-100 dark:border-gray-800 pt-4">
          <p className={lbl}>Tema sajta</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">
            Izaberite dizajn za stranicu vašeg salona
          </p>
          <div className="space-y-2">
            {themePickerThemesForTenant(tenant?.slug).map((theme) => {
              const selected = sp.form.landingTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => sp.setField("landingTheme", theme.id)}
                  className={[
                    "w-full text-left rounded-xl border-2 p-3 transition-all",
                    selected
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                      : "border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-14 h-10 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex">
                      {theme.previewColors.map((c, i) => (
                        <div
                          key={i}
                          className="flex-1"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          {theme.label}
                        </span>
                        {selected && (
                          <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/40 px-1.5 py-0.5 rounded-full">
                            Aktivna
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">
                        {theme.description}
                      </p>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${selected ? "border-violet-500 bg-violet-500" : "border-gray-300 dark:border-gray-600"}`}
                    >
                      {selected && (
                        <svg
                          className="w-full h-full text-white p-0.5"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {hasProfile && !sp.isEditing && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 w-full">
            <button
              onClick={() => sp.save()}
              disabled={sp.isSaving}
              className="px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition disabled:opacity-50"
            >
              {sp.isSaving ? "Snimanje..." : "Sačuvaj temu i logo"}
            </button>
          </div>
        )}
      </div>

      {/* Osnovni podaci */}
      <div className={card + " lg:col-span-2"}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900 dark:text-white">
            Osnovni podaci
          </h2>
          {hasProfile && !sp.isEditing && (
            <button
              onClick={sp.startEdit}
              className="flex items-center gap-1.5 text-sm font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition"
            >
              ✏️ Izmeni
            </button>
          )}
        </div>
        {hasProfile && !sp.isEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {[
              ["Naziv salona", sp.profile!.name],
              ["Email", sp.profile!.email],
              ["Telefon", sp.profile!.phone || "—"],
              ["Grad", sp.profile!.city || "—"],
              ["Adresa", sp.profile!.street || "—"],
              ["Newsletter email", sp.profile!.newsletterEmail || "—"],
              ["Kontakt email", sp.profile!.contactEmail || "—"],
              ["Marketing telefon", sp.profile!.marketingPhone || "—"],
            ].map(([l, v]) => (
              <div key={l}>
                <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  {l}
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200 mt-1 break-words">
                  {v}
                </p>
              </div>
            ))}
            {sp.profile!.description && (
              <div className="sm:col-span-2">
                <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  Opis
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 leading-relaxed">
                  {sp.profile!.description}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={lbl}>Naziv salona *</label>
                <input
                  className={inp}
                  value={sp.form.name}
                  onChange={(e) => sp.setField("name", e.target.value)}
                  placeholder="Nail Studio Anja"
                />
              </div>
              <div>
                <label className={lbl}>Email</label>
                <input
                  className={inp + " opacity-60 cursor-not-allowed"}
                  value={sp.form.email}
                  readOnly
                />
              </div>
              <div>
                <label className={lbl}>Telefon *</label>
                <input
                  className={inp}
                  value={sp.form.phone}
                  onChange={(e) => sp.setField("phone", e.target.value)}
                  placeholder="+381 60 123 4567"
                />
              </div>
              <div>
                <label className={lbl}>Grad</label>
                <input
                  className={inp}
                  value={sp.form.city}
                  onChange={(e) => sp.setField("city", e.target.value)}
                  placeholder="Beograd"
                />
              </div>
              <div>
                <label className={lbl}>Ulica i broj</label>
                <input
                  className={inp}
                  value={sp.form.street}
                  onChange={(e) => sp.setField("street", e.target.value)}
                  placeholder="Knez Mihailova 1"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={lbl}>Newsletter email</label>
                <input
                  className={inp}
                  value={sp.form.newsletterEmail}
                  onChange={(e) =>
                    sp.setField("newsletterEmail", e.target.value)
                  }
                  placeholder="newsletter@salon.com"
                />
              </div>
              <div>
                <label className={lbl}>Kontakt email</label>
                <input
                  type="email"
                  className={inp}
                  value={sp.form.contactEmail}
                  onChange={(e) =>
                    sp.setField("contactEmail", e.target.value)
                  }
                  placeholder="kontakt@salon.com"
                />
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  Adresa koju klijenti vide i na koju odgovaraju (kontakt,
                  podrška, Q&amp;A).
                </p>
              </div>
              <div>
                <label className={lbl}>Email za zakazivanja</label>
                <input
                  type="email"
                  className={inp}
                  value={sp.form.bookingEmail}
                  onChange={(e) =>
                    sp.setField("bookingEmail", e.target.value)
                  }
                  placeholder="booking@salon.com"
                />
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  Obaveštenja o novim terminima stižu ovde. Ako je prazno,
                  koristi se kontakt email.
                </p>
              </div>
              <div>
                <label className={lbl}>Marketing telefon</label>
                <input
                  type="tel"
                  className={inp}
                  value={sp.form.marketingPhone}
                  onChange={(e) =>
                    sp.setField("marketingPhone", e.target.value)
                  }
                  placeholder="+381 60 000 0001"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={lbl}>Opis salona</label>
                <textarea
                  className={inp + " resize-none"}
                  rows={3}
                  value={sp.form.description}
                  onChange={(e) =>
                    sp.setField("description", e.target.value)
                  }
                  placeholder="Kratki opis vašeg salona koji klijenti vide na sajtu..."
                />
              </div>
              {user?.globalRole === "OWNER" && (
                <div className="sm:col-span-2">
                  <label className={lbl}>Resend API ključ</label>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">
                    Vaš sopstveni Resend API ključ (Full Access) za slanje
                    emailova sa vašeg domena.
                  </p>
                  <div className="relative">
                    <input
                      type={showResendApiKey ? "text" : "password"}
                      className={`${inp} pr-12 font-mono`}
                      value={
                        (sp.form as { resendApiKey?: string })
                          .resendApiKey ?? ""
                      }
                      onChange={(e) =>
                        sp.setField("resendApiKey", e.target.value)
                      }
                      placeholder="re_••••••••••••••••"
                      autoComplete="off"
                    />
                    <PasswordVisibilityButton
                      visible={showResendApiKey}
                      onToggle={() => setShowResendApiKey((value) => !value)}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSaveWithAccount}
                disabled={sp.isSaving}
                className="px-6 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition disabled:opacity-50"
              >
                {sp.isSaving
                  ? "Snimanje..."
                  : hasProfile
                    ? "Sačuvaj izmene"
                    : "Kreiraj salon"}
              </button>
              {hasProfile && (
                <button
                  onClick={sp.cancelEdit}
                  className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-3"
                >
                  Otkaži
                </button>
              )}
            </div>
          </div>
        )}
        {/* Change password */}
        <div className={card + " lg:col-span-3 mt-8"}>
          <h2 className="font-bold text-gray-900 dark:text-white mb-5">
            Promena lozinke
          </h2>
          <form
            onSubmit={handlePasswordChange}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl"
          >
            <div>
              <label className={lbl}>Trenutna lozinka</label>
              <div className="relative">
                <input
                  type={showPasswords ? "text" : "password"}
                  className={`${inp} pr-12`}
                  value={pwForm.currentPassword}
                  onChange={(e) =>
                    setPwForm((p) => ({
                      ...p,
                      currentPassword: e.target.value,
                    }))
                  }
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
                <PasswordVisibilityButton
                  visible={showPasswords}
                  onToggle={() => setShowPasswords((value) => !value)}
                />
              </div>
            </div>
            <div>
              <label className={lbl}>Nova lozinka</label>
              <div className="relative">
                <input
                  type={showPasswords ? "text" : "password"}
                  className={`${inp} pr-12`}
                  value={pwForm.newPassword}
                  onChange={(e) =>
                    setPwForm((p) => ({
                      ...p,
                      newPassword: e.target.value,
                    }))
                  }
                  autoComplete="new-password"
                  placeholder="Najmanje 8 karaktera"
                />
                <PasswordVisibilityButton
                  visible={showPasswords}
                  onToggle={() => setShowPasswords((value) => !value)}
                />
              </div>
            </div>
            <div>
              <label className={lbl}>Potvrdite novu lozinku</label>
              <div className="relative">
                <input
                  type={showPasswords ? "text" : "password"}
                  className={`${inp} pr-12`}
                  value={pwForm.confirmPassword}
                  onChange={(e) =>
                    setPwForm((p) => ({
                      ...p,
                      confirmPassword: e.target.value,
                    }))
                  }
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
                <PasswordVisibilityButton
                  visible={showPasswords}
                  onToggle={() => setShowPasswords((value) => !value)}
                />
              </div>
              {pwForm.confirmPassword &&
                pwForm.newPassword !== pwForm.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">
                    Lozinke se ne poklapaju.
                  </p>
                )}
            </div>
            {pwError && (
              <p className="sm:col-span-3 text-red-500 text-xs">
                {pwError}
              </p>
            )}
            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={pwLoading}
                className="px-6 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition disabled:opacity-50"
              >
                {pwLoading ? "Menjam lozinku..." : "Promeni lozinku"}
              </button>
            </div>
          </form>
        </div>

        {/* Tehnička podešavanja — OWNER only */}
        {isOwner && (
          <div className={card + " lg:col-span-3 mt-8"}>
            <button
              type="button"
              onClick={() => setIdentityOpen((o) => !o)}
              className="flex items-center gap-2 font-bold text-gray-900 dark:text-white w-full text-left"
            >
              Tehnička podešavanja
              {identityOpen ? (
                <ChevronUpIcon className="size-4 text-gray-400" />
              ) : (
                <ChevronDownIcon className="size-4 text-gray-400" />
              )}
            </button>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Slug određuje URL salona (
              {tenant?.slug
                ? `${tenant.slug}.marysoll.com`
                : "slug.marysoll.com"}
              ). Promena sluga šalje obaveštenje superadminu.
            </p>
            {identityOpen && (
              <div className="mt-6 space-y-5 max-w-xl">
                <div>
                  <label className={lbl}>Slug</label>
                  <p className="text-[11px] text-gray-400 mb-1">
                    Samo mala slova, brojevi i crtice. Automatski ažurira
                    subdomen.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={identityForm.slug}
                      onChange={(e) =>
                        setIdentityForm((f) => ({
                          ...f,
                          slug: e.target.value,
                        }))
                      }
                      placeholder="ime-salona"
                      className={inp + " font-mono"}
                    />
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      .marysoll.com
                    </span>
                  </div>
                </div>
                <div>
                  <label className={lbl}>Cloudinary folder</label>
                  <p className="text-[11px] text-gray-400 mb-1">
                    Putanja do foldera sa slikama (npr. salons/salon-ime).
                  </p>
                  <input
                    type="text"
                    value={identityForm.cloudinaryFolder}
                    onChange={(e) =>
                      setIdentityForm((f) => ({
                        ...f,
                        cloudinaryFolder: e.target.value,
                      }))
                    }
                    placeholder="salons/salon-ime"
                    className={inp + " font-mono"}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isUpdatingIdentity}
                    onClick={() =>
                      updateIdentity({
                        slug: identityForm.slug,
                        cloudinaryFolder: identityForm.cloudinaryFolder,
                      })
                    }
                    className="px-6 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition disabled:opacity-50"
                  >
                    {isUpdatingIdentity
                      ? "Čuvam..."
                      : "Sačuvaj tehničke podatke"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="lg:col-span-3 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-900/10 p-5 space-y-6">
        <p className="text-sm font-bold text-red-700 dark:text-red-400">
          Opasna zona
        </p>

        {/* ── Trajno brisanje salona — JEDINA destruktivna owner akcija ──
             Vidi je samo OWNER; ADMIN i STAFF ne. Potvrda ide preko NAZIVA
             SALONA, ne emaila, jer se briše salon a ne nalog. */}
        {user?.globalRole === "OWNER" && (
        <div>
          <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-0.5">
            Trajno obriši salon
          </p>
          <p className="text-xs text-red-500 dark:text-red-400/70 mb-3">
            Trajno briše salon i sve njegove podatke, uključujući sadržaj,
            usluge, termine, podatke klijenata i naloge vlasnika, administratora
            i osoblja. Ova radnja je nepovratna. Ako želite samo pauzu, nemojte
            brisati salon.
          </p>
          {showDeleteSalon ? (
            <div className="space-y-3">
              <p className="text-xs text-red-600 dark:text-red-400">
                Upišite naziv salona{" "}
                <span className="font-bold">
                  &quot;{sp.profile?.name}&quot;
                </span>{" "}
                da biste potvrdili:
              </p>
              <input
                type="text"
                value={deleteSalonInput}
                onChange={(e) => setDeleteSalonInput(e.target.value)}
                placeholder={sp.profile?.name ?? "Naziv salona"}
                className="w-full max-w-xs border border-red-300 dark:border-red-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDeleteSalon}
                  disabled={
                    isDeletingSalon ||
                    deleteSalonInput.trim() !== (sp.profile?.name ?? "").trim()
                  }
                  className="px-5 py-2 bg-red-700 text-white text-sm font-bold rounded-xl hover:bg-red-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isDeletingSalon
                    ? "Brisanje..."
                    : "Da, trajno obriši salon"}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteSalon(false);
                    setDeleteSalonInput("");
                  }}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                >
                  Odustani
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteSalon(true)}
              className="px-5 py-2 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-semibold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition"
            >
              Trajno obriši salon
            </button>
          )}
        </div>
        )}
      </div>
    </div>
  </div>
  );
}
