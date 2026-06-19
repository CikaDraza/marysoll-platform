"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useClientRouting } from "@/hooks/useClientRouting";
import { Y2KAuthShell } from "./Y2KAuthShell";

type Step = "form" | "sent";

/**
 * Y2KForgotPasswordForm — Theme-8 client forgot-password. Same submit logic and
 * endpoint as ClientForgotPasswordPage (app/tenant/forgot-password), restyled Y2K.
 */
export function Y2KForgotPasswordForm() {
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
      <Y2KAuthShell shadow="#8B16C9">
        <div className="text-center">
          <div className="text-6xl mb-3">📬</div>
          <h1 className="m-0 font-bagel text-[30px] leading-[0.95] text-y2k-ink">
            Proverite email!
          </h1>
          <p className="text-[#42303a] text-sm mt-3 mb-6 font-medium">
            Poslali smo link za reset lozinke na <strong>{email}</strong>.
          </p>
          <Link
            href={`${base}/login`}
            className="text-y2k-pink text-sm font-bold hover:underline"
          >
            Nazad na prijavu
          </Link>
        </div>
      </Y2KAuthShell>
    );
  }

  return (
    <Y2KAuthShell shadow="#8B16C9">
      <Link
        href={`${base}/login`}
        className="font-extrabold text-[12px] tracking-[0.12em] uppercase text-y2k-purple"
      >
        ← Nazad na prijavu
      </Link>
      <h1 className="mt-4 mb-1 font-bagel text-[30px] leading-[0.95] text-y2k-ink">
        Zaboravili lozinku?
      </h1>
      <p className="text-[#42303a] text-sm font-medium mb-5">
        Unesite email da dobijete link za reset.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="block w-full px-3.5 py-3 border-[3px] border-y2k-ink rounded-[14px] text-[15px] text-y2k-ink bg-white outline-none placeholder:text-[#c9b3c0] focus:shadow-[3px_3px_0_#8B16C9] transition-shadow"
          placeholder="ime@email.com"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-y2k-pink text-white font-black text-[16px] tracking-[0.04em] uppercase py-3.5 border-[4px] border-y2k-ink rounded-full shadow-[4px_4px_0_#0b0b0f] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#0b0b0f] transition-all duration-200 disabled:opacity-60 cursor-pointer"
        >
          {loading ? "Slanje..." : "Pošalji link za reset"}
        </button>
      </form>
    </Y2KAuthShell>
  );
}
