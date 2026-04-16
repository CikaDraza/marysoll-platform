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

  if (step === "sent") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md text-center">
          <div className="text-6xl mb-4">📬</div>
          <h1 className="text-xl font-bold text-gray-900 mb-3">Proverite email!</h1>
          <p className="text-gray-500 text-sm mb-6">
            Poslali smo link za reset lozinke na <strong>{email}</strong>.
          </p>
          <Link href={`${base}/login`} className="text-purple-600 text-sm hover:underline">
            Nazad na prijavu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href={`${base}/login`} className="text-sm text-purple-600 font-semibold block mb-3">
            ← Nazad na prijavu
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Zaboravili ste lozinku?</h1>
          <p className="text-gray-500 text-sm mt-1">Unesite email da dobijete link za reset.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="ime@email.com"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2.5 rounded-xl font-semibold hover:bg-purple-700 transition disabled:opacity-50 text-sm"
          >
            {loading ? "Slanje..." : "Pošalji link za reset"}
          </button>
        </form>
      </div>
    </div>
  );
}
