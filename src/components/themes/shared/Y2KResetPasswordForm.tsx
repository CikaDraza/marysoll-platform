"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Y2KAuthShell } from "./Y2KAuthShell";
import { PasswordVisibilityButton } from "@/components/auth/PasswordVisibilityButton";

type Step = "loading" | "form" | "invalid" | "success";

/**
 * Y2KResetPasswordForm — Theme-8 reset-password. Same token check, validation,
 * endpoint (/api/auth/reset-password) and redirect as the default
 * components/auth/ResetPasswordForm, restyled Y2K. Rendered by
 * app/reset-password/page.tsx when the token's tenant uses Theme-8.
 */
export function Y2KResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [step, setStep] = useState<Step>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function init() {
      if (!token || token.length < 10) {
        setStep("invalid");
        return;
      }
      setStep("form");
    }
    init();
  }, [token]);

  function validate(): string | null {
    if (password.length < 8) return "Lozinka mora imati najmanje 8 karaktera.";
    if (password !== confirm) return "Lozinke se ne poklapaju.";
    if (!/[A-Za-z]/.test(password))
      return "Lozinka mora sadržati bar jedno slovo.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 400) {
          setStep("invalid");
          return;
        }
        toast.error(data.error ?? "Greška na serveru. Pokušajte ponovo.");
        return;
      }
      setStep("success");
      toast.success("Lozinka je uspešno promenjena!");
      setTimeout(() => router.push("/login?password_reset=true"), 2000);
    } catch {
      toast.error("Greška na serveru. Proverite internet konekciju.");
    } finally {
      setLoading(false);
    }
  }

  function getStrength(pwd: string): { level: number; label: string; color: string } {
    if (pwd.length === 0) return { level: 0, label: "", color: "" };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { level: 1, label: "Slaba", color: "bg-red-400" };
    if (score <= 2) return { level: 2, label: "Umerena", color: "bg-amber-400" };
    if (score <= 3) return { level: 3, label: "Dobra", color: "bg-y2k-purple" };
    return { level: 4, label: "Jaka", color: "bg-green-500" };
  }

  const strength = getStrength(password);

  if (step === "loading") {
    return (
      <Y2KAuthShell>
        <div className="text-center py-8">
          <div className="w-8 h-8 border-[3px] border-y2k-pink/30 border-t-y2k-pink rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#7a5a6c] text-sm font-semibold">
            Proveravamo link...
          </p>
        </div>
      </Y2KAuthShell>
    );
  }

  if (step === "invalid") {
    return (
      <Y2KAuthShell>
        <div className="text-center py-2">
          <div className="text-5xl mb-3">⏰</div>
          <h1 className="m-0 font-bagel text-[30px] leading-[0.95] text-y2k-ink mb-2">
            Link je istekao
          </h1>
          <p className="text-[#42303a] text-sm mb-6 font-medium">
            Link za resetovanje lozinke je nevažeći ili je istekao.
          </p>
          <Link
            href="/forgot-password"
            className="block w-full py-3.5 bg-y2k-pink text-white font-black text-sm uppercase tracking-[0.04em] rounded-full border-[4px] border-y2k-ink shadow-[4px_4px_0_#0b0b0f] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
          >
            Zatraži novi link →
          </Link>
          <Link
            href="/login"
            className="block mt-3 text-sm text-[#9a7d8b] hover:text-y2k-pink font-semibold"
          >
            Nazad na prijavu
          </Link>
        </div>
      </Y2KAuthShell>
    );
  }

  if (step === "success") {
    return (
      <Y2KAuthShell>
        <div className="text-center py-2">
          <div className="text-5xl mb-3">✅</div>
          <h1 className="m-0 font-bagel text-[28px] leading-[0.95] text-y2k-ink mb-2">
            Lozinka je promenjena!
          </h1>
          <p className="text-[#42303a] text-sm mb-6 font-medium">
            Vaša nova lozinka je aktivna. Preusmeravamo vas na prijavu...
          </p>
          <Link
            href="/login"
            className="block w-full py-3.5 bg-y2k-pink text-white font-black text-sm uppercase tracking-[0.04em] rounded-full border-[4px] border-y2k-ink shadow-[4px_4px_0_#0b0b0f] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
          >
            Prijavite se →
          </Link>
        </div>
      </Y2KAuthShell>
    );
  }

  return (
    <Y2KAuthShell>
      <div className="text-center mb-5">
        <div className="text-4xl mb-2">🔑</div>
        <h1 className="m-0 font-bagel text-[28px] leading-[0.95] text-y2k-ink">
          Nova lozinka
        </h1>
        <p className="text-[#42303a] text-sm mt-2 font-medium">
          Izaberite jaku lozinku za vaš nalog.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block font-extrabold text-[11px] uppercase tracking-[0.12em] text-[#9a7d8b] mb-1.5">
            Nova lozinka
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 karaktera"
              className="w-full px-3.5 py-3 pr-16 border-[3px] border-y2k-ink rounded-[14px] text-[15px] text-y2k-ink bg-white outline-none placeholder:text-[#c9b3c0] focus:shadow-[3px_3px_0_#8B16C9] transition-shadow"
              autoFocus
            />
            <PasswordVisibilityButton
              visible={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
              className="text-[#9a7d8b] hover:text-y2k-ink"
            />
          </div>
          {password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((lvl) => (
                  <div
                    key={lvl}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      lvl <= strength.level ? strength.color : "bg-y2k-ink/10"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-[#9a7d8b] mt-1 font-semibold">
                Jačina:{" "}
                <span className="text-y2k-ink">{strength.label}</span>
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="block font-extrabold text-[11px] uppercase tracking-[0.12em] text-[#9a7d8b] mb-1.5">
            Potvrda lozinke
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Ponovite lozinku"
              className={`w-full px-3.5 py-3 pr-12 border-[3px] rounded-[14px] text-[15px] text-y2k-ink bg-white outline-none placeholder:text-[#c9b3c0] transition-shadow focus:shadow-[3px_3px_0_#8B16C9] ${
                confirm.length > 0 && confirm !== password
                  ? "border-red-400"
                  : "border-y2k-ink"
              }`}
            />
            <PasswordVisibilityButton
              visible={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
              className="text-[#9a7d8b] hover:text-y2k-ink"
            />
          </div>
          {confirm.length > 0 && confirm !== password && (
            <p className="text-xs text-red-500 mt-1 font-semibold">
              Lozinke se ne poklapaju
            </p>
          )}
          {confirm.length > 0 && confirm === password && (
            <p className="text-xs text-green-600 mt-1 font-semibold">
              ✓ Lozinke se poklapaju
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || password !== confirm || password.length < 8}
          className="bg-y2k-pink text-white font-black text-[16px] tracking-[0.04em] uppercase py-3.5 border-[4px] border-y2k-ink rounded-full shadow-[4px_4px_0_#0b0b0f] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#0b0b0f] transition-all duration-200 disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Čuvanje..." : "Sačuvaj novu lozinku →"}
        </button>
      </form>

      <div className="mt-5 pt-4 border-t-2 border-y2k-ink/10 text-center">
        <Link
          href="/login"
          className="text-y2k-pink font-bold text-sm hover:underline"
        >
          ← Nazad na prijavu
        </Link>
      </div>
    </Y2KAuthShell>
  );
}
