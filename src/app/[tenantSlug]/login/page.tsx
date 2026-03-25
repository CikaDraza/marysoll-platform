/**
 * /[tenantSlug]/login — Login stranica za klijente konkretnog salona.
 * Ne prikazuje "Registruj salon" link — samo klijentska prijava.
 *
 * Works in two modes:
 *   - Path-based:    marysoll.com/kiki-makeup/login
 *   - Custom domain: kikikiss.beauty/login  (middleware rewrites internally)
 *
 * useClientRouting resolves the correct base so all links and redirects
 * work in both modes without branching logic in the component.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useClientRouting } from "@/hooks/useClientRouting";

export default function ClientLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { base } = useClientRouting();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("registered")) {
      toast.success("Registracija uspešna! Proverite email za verifikaciju.", {
        duration: 5000,
      });
    }
    if (searchParams.get("password_reset")) {
      toast.success("Lozinka je promenjena. Prijavite se.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === "EMAIL_NOT_VERIFIED") {
          toast.error(
            "Email nije verifikovan. Proverite inbox ili zatražite novi link.",
            { duration: 5000 },
          );
          return;
        }
        toast.error(data.error ?? "Greška pri prijavi");
        return;
      }

      localStorage.setItem("token", data.token);
      if (data.refreshToken)
        localStorage.setItem("refreshToken", data.refreshToken);

      // Navigate to the from-param destination or default to panel.
      // base is "" on custom domain, "/kiki-makeup" on path-based — so the
      // resulting path is always correct in the browser URL bar.
      const from = searchParams.get("from");
      router.push(from ? `${base}/${from}` : `${base}/panel`);
    } catch {
      toast.error("Greška na serveru");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href={`${base}/`}
            className="text-2xl font-bold text-purple-600"
          >
            ← Nazad na salon
          </Link>
          <h1 className="text-xl font-bold text-gray-900 mt-3">Prijava</h1>
          <p className="text-gray-500 text-sm mt-1">Unesite vaše podatke</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="ime@email.com"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lozinka
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <Link
              href={`${base}/resend-verification`}
              className="text-gray-400 hover:text-purple-600 text-xs"
            >
              Nisam dobio/la email
            </Link>
            <Link
              href={`${base}/forgot-password`}
              className="text-purple-600 hover:underline text-xs"
            >
              Zaboravili ste lozinku?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2.5 rounded-xl font-semibold hover:bg-purple-700 transition disabled:opacity-50 text-sm"
          >
            {loading ? "Prijavljivanje..." : "Prijavi se"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Nemate nalog?{" "}
          <Link
            href={`${base}/register`}
            className="text-purple-600 font-medium hover:underline"
          >
            Registrujte se
          </Link>
        </p>
      </div>
    </div>
  );
}
