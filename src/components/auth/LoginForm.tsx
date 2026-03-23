"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
    if (alreadyVerified) {
      toast("Email je već verifikovan.", { icon: "ℹ️" });
    }
    if (passwordReset) {
      toast.success("Lozinka je uspešno promenjena! Prijavite se.", {
        duration: 5000,
      });
    }
  }, [searchParams]);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
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
      toast.success("Uspešno ste prijavljeni!");
      localStorage.setItem("token", data.token);
      if (data.refreshToken)
        localStorage.setItem("refreshToken", data.refreshToken);

      if (data.user?.isSuperAdmin) {
        window.location.href = `https://superadmin.${process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com"}/superadmin/dashboard`;
      } else if (data.user?.isAdmin) {
        window.location.href = `https://admin.${process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com"}/dashboard`;
      } else {
        router.push("/");
      }
    } catch {
      toast.error("Greška na serveru");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-xs lg:max-w-lg lg:w-96">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-purple-600">
            Marysoll
          </Link>
          <h1 className="text-7xl font-bold text-gray-900 mt-3">Prijava</h1>
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
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <Link
              href="/resend-verification"
              className="text-gray-400 hover:text-purple-600"
            >
              Nisam dobio/la email za verifikaciju
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2.5 rounded-xl font-semibold hover:bg-purple-700 transition disabled:opacity-50"
          >
            {loading ? "Prijavljivanje..." : "Prijavi se"}
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
