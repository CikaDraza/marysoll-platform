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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition"
          placeholder="ime@salon.com"
          autoFocus
          disabled={isLoggingIn}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Lozinka
          </label>
          <Link
            href="/forgot-password"
            className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
          >
            Zaboravili ste lozinku?
          </Link>
        </div>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition"
          placeholder="••••••••"
          disabled={isLoggingIn}
        />
      </div>

      <div className="text-sm">
        <Link
          href="/resend-verification"
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-violet-600 dark:hover:text-violet-400"
        >
          Nisam dobio/la email za verifikaciju
        </Link>
      </div>

      <button
        type="submit"
        disabled={isLoggingIn}
        className="w-full bg-violet-600 text-white py-2.5 rounded-xl font-semibold hover:bg-violet-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isLoggingIn && (
          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        )}
        {isLoggingIn ? "Prijavljivanje..." : "Prijavi se"}
      </button>
    </form>
  );
}
