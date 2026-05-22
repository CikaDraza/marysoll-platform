"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

type Step = "loading" | "form" | "invalid" | "success";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [step, setStep] = useState<Step>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Provjera tokena kad se stranica učita
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
          // Token istekao ili nevažeći
          setStep("invalid");
          return;
        }
        toast.error(data.error ?? "Greška na serveru. Pokušajte ponovo.");
        return;
      }

      setStep("success");
      toast.success("Lozinka je uspešno promenjena!");

      // Redirect na login posle 2 sekunde
      setTimeout(() => {
        router.push("/login?password_reset=true");
      }, 2000);
    } catch {
      toast.error("Greška na serveru. Proverite internet konekciju.");
    } finally {
      setLoading(false);
    }
  }

  // Password strength indicator
  function getStrength(pwd: string): {
    level: number;
    label: string;
    color: string;
  } {
    if (pwd.length === 0) return { level: 0, label: "", color: "" };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { level: 1, label: "Slaba", color: "bg-red-400" };
    if (score <= 2)
      return { level: 2, label: "Umerena", color: "bg-amber-400" };
    if (score <= 3) return { level: 3, label: "Dobra", color: "bg-blue-400" };
    return { level: 4, label: "Jaka", color: "bg-green-500" };
  }

  const strength = getStrength(password);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold text-purple-600 tracking-tight">
              Marysoll
            </span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {/* Loading */}
          {step === "loading" && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500 text-sm">Proveravamo link...</p>
            </div>
          )}

          {/* Invalid token */}
          {step === "invalid" && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">⏰</div>
              <h1 className="text-7xl font-bold text-gray-900 mb-2">
                Link je istekao
              </h1>
              <p className="text-gray-500 text-sm mb-6">
                Link za resetovanje lozinke je nevažeći ili je istekao. Svaki
                link važi samo <strong>1 sat</strong>.
              </p>
              <Link
                href="/forgot-password"
                className="inline-block w-full py-3 bg-purple-600 text-white font-semibold text-sm rounded-xl hover:bg-purple-700 transition text-center"
              >
                Zatraži novi link →
              </Link>
              <Link
                href="/login"
                className="block mt-3 text-sm text-gray-400 hover:text-gray-600"
              >
                Nazad na prijavu
              </Link>
            </div>
          )}

          {/* Success */}
          {step === "success" && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">✅</div>
              <h1 className="text-7xl font-bold text-gray-900 mb-2">
                Lozinka je promenjena!
              </h1>
              <p className="text-gray-500 text-sm mb-6">
                Vaša nova lozinka je aktivna. Bićete preusmereni na stranicu za
                prijavu...
              </p>
              <Link
                href="/login"
                className="inline-block w-full py-3 bg-purple-600 text-white font-semibold text-sm rounded-xl hover:bg-purple-700 transition text-center"
              >
                Prijavite se →
              </Link>
            </div>
          )}

          {/* Reset form */}
          {step === "form" && (
            <>
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">🔑</div>
                <h1 className="text-7xl font-bold text-gray-900">
                  Postavite novu lozinku
                </h1>
                <p className="text-gray-500 text-sm mt-2">
                  Izaberite jaku lozinku za vaš nalog.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nova lozinka */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                    Nova lozinka
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 karaktera"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white transition"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                    >
                      {showPassword ? "Sakrij" : "Prikaži"}
                    </button>
                  </div>

                  {/* Strength bar */}
                  {password.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((lvl) => (
                          <div
                            key={lvl}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              lvl <= strength.level
                                ? strength.color
                                : "bg-gray-100"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Jačina:{" "}
                        <span className="font-semibold text-gray-600">
                          {strength.label}
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Potvrda lozinke */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                    Potvrda lozinke
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Ponovite lozinku"
                    className={`w-full border rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white transition ${
                      confirm.length > 0 && confirm !== password
                        ? "border-red-300 ring-1 ring-red-200"
                        : confirm.length > 0 && confirm === password
                          ? "border-green-300"
                          : "border-gray-200"
                    }`}
                  />
                  {confirm.length > 0 && confirm !== password && (
                    <p className="text-xs text-red-500 mt-1">
                      Lozinke se ne poklapaju
                    </p>
                  )}
                  {confirm.length > 0 && confirm === password && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Lozinke se poklapaju
                    </p>
                  )}
                </div>

                {/* Saveti */}
                <div className="bg-purple-50 rounded-xl p-3">
                  <p className="text-xs text-purple-700 font-semibold mb-1">
                    Preporuke za jaku lozinku:
                  </p>
                  <ul className="text-xs text-purple-600 space-y-0.5">
                    <li
                      className={
                        password.length >= 8 ? "line-through opacity-50" : ""
                      }
                    >
                      · Minimum 8 karaktera
                    </li>
                    <li
                      className={
                        /[A-Z]/.test(password) ? "line-through opacity-50" : ""
                      }
                    >
                      · Veliko slovo (A-Z)
                    </li>
                    <li
                      className={
                        /[0-9]/.test(password) ? "line-through opacity-50" : ""
                      }
                    >
                      · Broj (0-9)
                    </li>
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={
                    loading || password !== confirm || password.length < 8
                  }
                  className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-purple-700 transition disabled:opacity-50 shadow-sm"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Čuvanje...
                    </span>
                  ) : (
                    "Sačuvaj novu lozinku →"
                  )}
                </button>
              </form>
            </>
          )}

          {/* Footer */}
          {step !== "success" && (
            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                <Link
                  href="/login"
                  className="text-purple-600 font-semibold hover:underline"
                >
                  ← Nazad na prijavu
                </Link>
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Marysoll · Platforma za beauty salone
        </p>
      </div>
    </div>
  );
}
