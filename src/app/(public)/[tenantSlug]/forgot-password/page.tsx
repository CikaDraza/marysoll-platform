"use client";
import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useClientRouting } from "@/hooks/useClientRouting";

type Step = "form" | "sent";

export default function ClientForgotPasswordPage() {
  const { base } = useClientRouting();
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (res.ok) setStep("sent");
      else toast.error("Greška na serveru. Pokušajte ponovo.");
    } catch {
      toast.error("Greška na serveru.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <Link
            href={`${base}/login`}
            className="text-sm text-purple-600 font-semibold"
          >
            ← Nazad na prijavu
          </Link>
        </div>
        {step === "form" ? (
          <>
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🔐</div>
              <h1 className="text-xl font-bold text-gray-900">
                Zaboravili ste lozinku?
              </h1>
              <p className="text-gray-500 text-sm mt-2">
                Unesite email i poslaćemo vam link za resetovanje.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vas@email.com"
                autoFocus
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-purple-700 transition disabled:opacity-50"
              >
                {loading ? "Slanje..." : "Pošalji link →"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="text-5xl mb-4">📬</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Email je poslat!
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              Ako nalog sa adresom <strong>{email}</strong> postoji, dobićete
              link za resetovanje. Link važi <strong>1 sat</strong>.
            </p>
            <Link
              href={`${base}/login`}
              className="text-purple-600 text-sm font-semibold hover:underline"
            >
              Nazad na prijavu
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
