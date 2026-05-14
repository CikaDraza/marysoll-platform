"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSuperAdminPassword } from "@/hooks/useSuperAdminPassword";
import { useSuperAdminPlatformProfile } from "@/hooks/useSuperAdminPlatformProfile";
import {
  superAdminCardClass as card,
  superAdminInputClass as inp,
  superAdminLabelClass as lbl,
  superAdminPrimaryButtonClass as btnPrimary,
} from "@/components/superadmin/shared";

export function ProfilTab() {
  const { user } = useAuth();
  const { form, setForm, formError, submitProfile, saveProfile } =
    useSuperAdminPlatformProfile();
  const { changePassword, getChangePasswordErrorMessage } =
    useSuperAdminPassword();
  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwError, setPwError] = useState("");

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    await submitProfile();
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      const msg = "Nove lozinke se ne poklapaju.";
      setPwError(msg);
      toast.error(msg);
      return;
    }
    if (pwForm.newPassword.length < 8) {
      const msg = "Nova lozinka mora imati najmanje 8 karaktera.";
      setPwError(msg);
      toast.error(msg);
      return;
    }

    try {
      await changePassword.mutateAsync({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: unknown) {
      setPwError(getChangePasswordErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6 max-w-full">
      <h2 className="text-lg font-bold">Profil superadmina</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={card}>
          <h3 className="font-semibold text-sm mb-4 text-violet-400">
            Informacije naloga
          </h3>
          <form onSubmit={handleSaveAccount} className="space-y-4">
            <div>
              <label className={lbl}>Email adresa</label>
              <div className={inp + " opacity-60 cursor-not-allowed select-none"}>
                {user?.email ?? "—"}
              </div>
            </div>
            <div>
              <label className={lbl}>Rola</label>
              <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-violet-900/60 text-violet-300 border border-violet-700 uppercase tracking-widest">
                SUPER ADMIN
              </span>
            </div>

            <div>
              <label className={lbl}>Ime</label>
              <input
                type="text"
                className={inp}
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Vaše ime"
              />
            </div>
            <div>
              <label className={lbl}>Kontakt telefon</label>
              <input
                type="tel"
                className={inp}
                value={form.phone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, phone: e.target.value }))
                }
                placeholder="+381 60 000 0000"
              />
              <p className="text-xs text-slate-500 mt-1">
                Interni kontakt broj za tehničku podršku.
              </p>
            </div>
            <div>
              <label className={lbl}>Marketing telefon</label>
              <input
                type="tel"
                className={inp}
                value={form.marketingPhone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, marketingPhone: e.target.value }))
                }
                placeholder="+381 60 000 0001"
              />
              <p className="text-xs text-slate-500 mt-1">
                Broj koji se prikazuje u marketinškim materijalima.
              </p>
            </div>
            <div>
              <label className={lbl}>Logo URL</label>
              <input
                type="url"
                className={inp}
                value={form.logoUrl}
                onChange={(e) =>
                  setForm((p) => ({ ...p, logoUrl: e.target.value }))
                }
                placeholder="https://..."
              />
              <p className="text-xs text-slate-500 mt-1">
                URL platformskog logotipa za buduće prikaze i email šablone.
              </p>
            </div>
            <div>
              <label className={lbl}>Newsletter email</label>
              <input
                type="email"
                className={inp}
                value={form.newsletterEmail}
                onChange={(e) =>
                  setForm((p) => ({ ...p, newsletterEmail: e.target.value }))
                }
                placeholder="newsletter@marysoll.com"
              />
              <p className="text-xs text-slate-500 mt-1">
                Adresa sa koje se šalju platformski newsletter emailovi.
              </p>
            </div>
            <div>
              <label className={lbl}>Kontakt email</label>
              <input
                type="email"
                className={inp}
                value={form.contactEmail}
                onChange={(e) =>
                  setForm((p) => ({ ...p, contactEmail: e.target.value }))
                }
                placeholder="kontakt@marysoll.com"
              />
              <p className="text-xs text-slate-500 mt-1">
                Adresa za klijentske upite prema platformi.
              </p>
            </div>

            {formError && <p className="text-red-400 text-xs">{formError}</p>}
            <button
              type="submit"
              disabled={saveProfile.isPending}
              className={btnPrimary}
            >
              {saveProfile.isPending ? "Snimanje..." : "Sačuvaj podatke naloga"}
            </button>
          </form>
        </div>

        <div className={card}>
          <h3 className="font-semibold text-sm mb-4 text-violet-400">
            Promena lozinke
          </h3>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className={lbl}>Trenutna lozinka</label>
              <input
                type="password"
                className={inp}
                value={pwForm.currentPassword}
                onChange={(e) =>
                  setPwForm((p) => ({ ...p, currentPassword: e.target.value }))
                }
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className={lbl}>Nova lozinka</label>
              <input
                type="password"
                className={inp}
                value={pwForm.newPassword}
                onChange={(e) =>
                  setPwForm((p) => ({ ...p, newPassword: e.target.value }))
                }
                autoComplete="new-password"
                placeholder="Najmanje 8 karaktera"
              />
            </div>
            <div>
              <label className={lbl}>Potvrdite novu lozinku</label>
              <input
                type="password"
                className={inp}
                value={pwForm.confirmPassword}
                onChange={(e) =>
                  setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))
                }
                autoComplete="new-password"
                placeholder="••••••••"
              />
              {pwForm.confirmPassword &&
                pwForm.newPassword !== pwForm.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">
                    Lozinke se ne poklapaju.
                  </p>
                )}
            </div>
            {pwError && <p className="text-red-400 text-xs">{pwError}</p>}
            <button
              type="submit"
              disabled={changePassword.isPending}
              className={btnPrimary}
            >
              {changePassword.isPending ? "Menjam lozinku..." : "Promeni lozinku"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
