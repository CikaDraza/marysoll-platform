"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const token = searchParams.get("token");
    const type = searchParams.get("type") ?? "client";
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const alreadyVerified = searchParams.get("already_verified");

    async function verifyEmail() {
      if (alreadyVerified) {
        setStatus("already_verified");
        return;
      }
      if (success === "owner") {
        setStatus("success_owner");
        return;
      }
      if (success === "client") {
        setStatus("success_client");
        return;
      }
      if (error) {
        setStatus("error");
        return;
      }
      if (token) {
        try {
          const res = await fetch(
            `/api/auth/verify?token=${token}&type=${type}`,
          );
          const data = await res.json();
          if (data.success) {
            setStatus(type === "owner" ? "success_owner" : "success_client");
          } else {
            setStatus("error");
          }
        } catch (err: unknown) {
          console.error(
            "Greška pri verifikaciji emaila:",
            err instanceof Error ? err.message : err,
          );
          setStatus("error");
        }
      } else {
        setStatus("error");
      }
    }

    verifyEmail();

    // Ima token — pozovi GET endpoint koji redirect-uje nazad
    if (token) {
      router.replace(`/api/auth/verify?token=${token}&type=${type}`);
      return;
    }
  }, [searchParams, router]);

  const msg = messages[status];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md text-center">
        {/* Logo */}
        <div className="mb-8">
          <span className="text-2xl font-bold text-purple-600">Marysoll</span>
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
            href={msg.cta.href}
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
