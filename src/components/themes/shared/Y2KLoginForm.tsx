"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useClientRouting } from "@/hooks/useClientRouting";
import { useTenant } from "@/contexts/TenantContext";
import { genderPast } from "@/lib/clientWording";
import { Y2KAuthShell } from "./Y2KAuthShell";
import { PENDING_STORAGE_KEY } from "@/components/shared/booking/types";

const inputCls =
  "mt-1.5 block w-full px-3.5 py-3 border-[3px] border-y2k-ink rounded-[14px] text-[15px] text-y2k-ink bg-white outline-none placeholder:text-[#c9b3c0] focus:shadow-[3px_3px_0_#8B16C9] transition-shadow";
const labelCls =
  "block font-extrabold text-[11px] tracking-[0.12em] uppercase text-[#9a7d8b]";

/**
 * Y2KLoginForm — Theme-8 client login. Same submit logic, endpoints and
 * redirects as the default ClientLoginPage (app/tenant/login/page.tsx),
 * restyled to the Y2K aesthetic.
 */
export function Y2KLoginForm() {
  const searchParams = useSearchParams();
  const { base, tenantSlug } = useClientRouting();
  const { clientGender } = useTenant();

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
      const res = await fetch("/api/tenant-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, tenantSlug }),
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
        if (data.code === "NO_TENANT_ACCOUNT") {
          toast.error(
            "Nemate nalog na ovom salonu. Registrujte se da biste nastavili.",
            { duration: 6000 },
          );
          return;
        }
        toast.error(data.error ?? "Greška pri prijavi");
        return;
      }

      localStorage.setItem("token", data.token);

      const from = searchParams.get("from");
      const hasPendingBooking =
        searchParams.get("pendingBooking") === "1" ||
        Boolean(sessionStorage.getItem(PENDING_STORAGE_KEY));
      const destination = hasPendingBooking
        ? `${base}/`
        : from
          ? `${base}/${from}`
          : `${base}/panel`;
      window.location.href = destination;
    } catch {
      toast.error("Greška na serveru");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Y2KAuthShell shadow="#8B16C9">
      <Link
        href={`${base}/`}
        className="font-extrabold text-[12px] tracking-[0.12em] uppercase text-y2k-purple"
      >
        ← Nazad na salon
      </Link>
      <div className="font-extrabold text-[11px] tracking-[0.22em] uppercase text-y2k-purple mt-4">
        Members
      </div>
      <h1 className="m-0 font-bagel text-[34px] leading-[0.95] text-y2k-ink">
        Welcome back ♡
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-5">
        <label className={labelCls}>
          Email
        <input
          type="email"
          name="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            placeholder="ime@email.com"
            autoFocus
          />
        </label>
        <label className={labelCls}>
          Lozinka
        <input
          type="password"
          name="password"
          autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            placeholder="••••••••"
          />
        </label>

        <div className="flex items-center justify-between text-xs">
          <Link
            href={`${base}/resend-verification`}
            className="text-[#9a7d8b] hover:text-y2k-pink font-semibold"
          >
            {genderPast(clientGender, "Nisam dobila email", "Nisam dobio/la email")}
          </Link>
          <Link
            href={`${base}/forgot-password`}
            className="text-y2k-pink font-bold hover:underline"
          >
            Zaboravili ste lozinku?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-1 bg-y2k-pink text-white font-black text-[16px] tracking-[0.04em] uppercase py-3.5 border-[4px] border-y2k-ink rounded-full shadow-[4px_4px_0_#0b0b0f] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#0b0b0f] transition-all duration-200 disabled:opacity-60 cursor-pointer"
        >
          {loading ? "Prijavljivanje..." : "Log in"}
        </button>
      </form>

      <p className="text-center text-sm text-[#7a5a6c] mt-5 font-semibold">
        Nemate nalog?{" "}
        <Link
          href={`${base}/register`}
          className="text-y2k-pink font-bold hover:underline"
        >
          Registrujte se →
        </Link>
      </p>
    </Y2KAuthShell>
  );
}
