"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Status =
  | "loading"
  | "success_owner"
  | "success_client"
  | "error"
  | "already_verified";

const messages: Record<
  Status,
  {
    icon: string;
    title: string;
    text: string;
    cta?: { label: string; href: string };
  }
> = {
  loading: {
    icon: "⏳",
    title: "Proveravamo vaš link...",
    text: "Sačekajte trenutak.",
  },
  success_owner: {
    icon: "🎉",
    title: "Email potvrđen! Salon je aktivan.",
    text: "Probni period od 30 dana je počeo. Prijavite se i popunite profil salona.",
    cta: { label: "Prijavite se →", href: "/login" },
  },
  success_client: {
    icon: "✅",
    title: "Nalog aktiviran!",
    text: "Možete se prijaviti i zakazati termin.",
    cta: { label: "Prijavite se →", href: "/login" },
  },
  already_verified: {
    icon: "ℹ️",
    title: "Email je već potvrđen",
    text: "Vaš nalog je već aktivan.",
    cta: { label: "Prijavite se →", href: "/login" },
  },
  error: {
    icon: "❌",
    title: "Link nije validan",
    text: "Link je istekao ili je već iskorišćen. Zatražite novi link za verifikaciju.",
    cta: { label: "Zatražite novi link →", href: "/resend-verification" },
  },
};

export default function VerifyEmailForm() {
  const searchParams = useSearchParams();

  const token = searchParams.get("token");
  const type = searchParams.get("type") ?? "client";
  const success = searchParams.get("success");
  const error = searchParams.get("error");
  const alreadyVerified = searchParams.get("already_verified");
  const loginUrl = searchParams.get("loginUrl") ?? "/login";

  const status = useMemo<Status>(() => {
    if (alreadyVerified) return "already_verified";
    if (success === "owner") return "success_owner";
    if (success === "client") return "success_client";
    if (error) return "error";
    if (!token) return "error";
    return "loading";
  }, [alreadyVerified, success, error, token]);

  useEffect(() => {
    if (token && status === "loading") {
      window.location.href = `/api/auth/verify?token=${token}&type=${type}`;
    }
  }, [token, type, status]);

  const msg = messages[status];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md text-center">
        {/* Logo */}
        {/* Monogram icon — always visible */}
        <div className="flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-sm">
            M
          </div>
          <div className="mb-8">
            <span className="text-lg font-bold text-purple-600">Marysoll</span>
          </div>
        </div>

        {/* Status */}
        <div className="text-5xl mb-4">{msg.icon}</div>

        {status === "loading" && (
          <div className="flex justify-center mb-4">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        )}

        <h1 className="text-xl font-bold text-gray-900 mb-3">{msg.title}</h1>
        <p className="text-gray-500 text-sm mb-8">{msg.text}</p>

        {msg.cta && (
          <Link
            href={msg.cta.href === "/login" ? loginUrl : msg.cta.href}
            className="inline-block bg-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-purple-700 transition"
          >
            {msg.cta.label}
          </Link>
        )}

        <p className="text-xs text-gray-400 mt-6">
          Imate pitanje?{" "}
          <a
            href="mailto:podrska@marysoll.com"
            className="text-purple-500 hover:underline"
          >
            Kontaktirajte nas
          </a>
        </p>
      </div>
    </div>
  );
}
