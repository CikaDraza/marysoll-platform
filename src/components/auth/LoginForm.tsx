"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoggingIn, isLoggedIn, isAdmin, isSuperAdmin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const [unverifiedEmail, setUnverifiedEmail] = useState(false);

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

  function validateFields(): boolean {
    const errs = { email: "", password: "" };
    if (!email.trim()) {
      errs.email = "Email je obavezan";
    } else if (!EMAIL_RE.test(email)) {
      errs.email = "Unesite ispravnu email adresu";
    }
    if (!password) {
      errs.password = "Lozinka je obavezna";
    }
    setFieldErrors(errs);
    return !errs.email && !errs.password;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUnverifiedEmail(false);
    if (!validateFields()) return;
    try {
      await login(email, password);
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } })
        ?.response?.data?.code;
      if (code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(true);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldErrors.email)
              setFieldErrors((prev) => ({ ...prev, email: "" }));
            setUnverifiedEmail(false);
          }}
          className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition ${
            fieldErrors.email
              ? "border-red-400 bg-red-50 dark:bg-red-950"
              : "border-gray-200 dark:border-gray-700"
          }`}
          placeholder="ime@salon.com"
          autoFocus
          disabled={isLoggingIn}
        />
        {fieldErrors.email && (
          <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
        )}
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
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (fieldErrors.password)
              setFieldErrors((prev) => ({ ...prev, password: "" }));
          }}
          className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition ${
            fieldErrors.password
              ? "border-red-400 bg-red-50 dark:bg-red-950"
              : "border-gray-200 dark:border-gray-700"
          }`}
          placeholder="••••••••"
          disabled={isLoggingIn}
        />
        {fieldErrors.password && (
          <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>
        )}
      </div>

      {unverifiedEmail ? (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Email nije verifikovan.{" "}
          <Link
            href="/resend-verification"
            className="font-semibold underline hover:no-underline"
          >
            Zatražite novi link →
          </Link>
        </div>
      ) : (
        <div className="text-sm">
          <Link
            href="/resend-verification"
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-violet-600 dark:hover:text-violet-400"
          >
            Nisam dobio/la email za verifikaciju
          </Link>
        </div>
      )}

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
