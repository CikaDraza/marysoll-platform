"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoggingIn, isLoggedIn, isAdmin, isSuperAdmin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Toast iz query params (redirect nakon registracije, reset lozinke itd.)
  useEffect(() => {
    const registered = searchParams.get("registered");
    const subdomain = searchParams.get("subdomain");
    const alreadyVerified = searchParams.get("already_verified");
    const passwordReset = searchParams.get("password_reset");

    if (registered && subdomain) {
      toast.success(
        `Salon registrovan! Proverite email za verifikaciju.\nSubdomen: ${subdomain}`,
        { duration: 6000 },
      );
    }
    if (alreadyVerified) toast("Email je već verifikovan.", { icon: "ℹ️" });
    if (passwordReset)
      toast.success("Lozinka je uspešno promenjena! Prijavite se.", {
        duration: 5000,
      });
  }, [searchParams]);

  // Ako je već ulogovan kao klijent — preusmeri
  useEffect(() => {
    if (isLoggedIn && !isAdmin && !isSuperAdmin) {
      router.push("/");
    }
  }, [isLoggedIn, isAdmin, isSuperAdmin, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      // Sva logika (redirect, toast, token storage) je u useAuth.login
      await login(email, password);
    } catch {
      // Greška je već prikazana u useAuth.onError — ništa ovde
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-xs lg:max-w-lg lg:w-96">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-purple-600">
            Marysoll
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mt-3">Prijava</h1>
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
              placeholder="ime@salon.com"
              autoFocus
              disabled={isLoggingIn}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Lozinka
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-purple-600 hover:underline"
              >
                Zaboravili ste lozinku?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="••••••••"
              disabled={isLoggingIn}
            />
          </div>

          <div className="text-sm">
            <Link
              href="/resend-verification"
              className="text-gray-400 hover:text-purple-600"
            >
              Nisam dobio/la email za verifikaciju
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-purple-600 text-white py-2.5 rounded-xl font-semibold hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoggingIn && (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {isLoggingIn ? "Prijavljivanje..." : "Prijavi se"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Nemate nalog?{" "}
          <Link
            href="/register"
            className="text-purple-600 font-medium hover:underline"
          >
            Registrujte salon
          </Link>
        </p>
      </div>
    </div>
  );
}
