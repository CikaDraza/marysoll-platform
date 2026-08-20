"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

type Step = "form" | "sent";

export default function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Unesite email adresu");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      // Uvek pokazujemo "sent" ekran — security best practice (ne otkrivamo da li nalog postoji)
      if (res.ok || res.status === 200) {
        setStep("sent");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Greška na serveru. Pokušajte ponovo.");
      }
    } catch {
      toast.error("Greška na serveru. Proverite internet konekciju.");
    } finally {
      setLoading(false);
    }
  }

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
          {step === "form" ? (
            <>
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">🔐</div>
                <h1 className="text-7xl font-bold text-gray-900">
                  Zaboravili ste lozinku?
                </h1>
                <p className="text-gray-500 text-sm mt-2">
                  Unesite email i poslaćemo vam link za resetovanje.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                    Email adresa
                  </label>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vas@email.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white transition placeholder:text-gray-400"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-purple-700 transition disabled:opacity-50 shadow-sm"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Slanje...
                    </span>
                  ) : (
                    "Pošalji link za resetovanje →"
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Sent state */
            <div className="text-center py-4">
              <div className="text-5xl mb-4">📬</div>
              <h1 className="text-7xl font-bold text-gray-900 mb-2">
                Email je poslat!
              </h1>
              <p className="text-gray-500 text-sm mb-2">Ako nalog sa adresom</p>
              <p className="font-semibold text-purple-700 text-sm bg-purple-50 rounded-lg px-4 py-2 inline-block mb-4">
                {email}
              </p>
              <p className="text-gray-500 text-sm mb-6">
                postoji, dobićete email sa linkom za resetovanje lozinke. Link
                važi <strong>1 sat</strong>.
              </p>
              <div className="space-y-2">
                <button
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const res = await fetch("/api/auth/forgot-password", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email }),
                      });
                      if (!res.ok) throw new Error("Reset request failed");
                      toast.success("Link je ponovo poslat!");
                    } catch {
                      toast.error("Greška. Pokušajte ponovo.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full py-2.5 border border-purple-200 text-purple-600 text-sm font-semibold rounded-xl hover:bg-purple-50 transition"
                >
                  {loading ? "Slanje..." : "Pošalji ponovo"}
                </button>
                <button
                  onClick={() => {
                    setStep("form");
                    setEmail("");
                  }}
                  className="w-full py-2.5 text-gray-400 text-sm hover:text-gray-600"
                >
                  Promeni email adresu
                </button>
              </div>
            </div>
          )}

          {/* Footer links */}
          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Setili ste se lozinke?{" "}
              <Link
                href="/login"
                className="text-purple-600 font-semibold hover:underline"
              >
                Prijavite se
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Marysoll · Platforma za beauty salone
        </p>
      </div>
    </div>
  );
}
