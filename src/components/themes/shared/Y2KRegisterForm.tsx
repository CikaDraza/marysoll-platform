"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useClientRouting } from "@/hooks/useClientRouting";
import { Y2KAuthShell } from "./Y2KAuthShell";

type Step = "form" | "check_email";

const inputCls =
  "mt-1.5 block w-full px-3.5 py-3 border-[3px] border-y2k-ink rounded-[14px] text-[15px] text-y2k-ink bg-white outline-none placeholder:text-[#c9b3c0] focus:shadow-[3px_3px_0_#8B16C9] transition-shadow";
const labelCls =
  "block font-extrabold text-[11px] tracking-[0.12em] uppercase text-[#9a7d8b]";

/**
 * Y2KRegisterForm — Theme-8 client registration. Same submit logic, validation,
 * endpoint and "check email" step as ClientRegisterPage (app/tenant/register),
 * restyled Y2K.
 */
export function Y2KRegisterForm() {
  const { base, tenantSlug } = useClientRouting();

  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    instagram: "",
    agreedToPrivacy: false,
  });

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.agreedToPrivacy) {
      toast.error("Morate prihvatiti politiku privatnosti");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Lozinka mora imati najmanje 8 karaktera");
      return;
    }
    if (!form.phone.trim() && !form.instagram.trim()) {
      toast.error("Unesite telefon ili Instagram profil.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/tenant-auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          tenantSlug: base ? tenantSlug : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Greška pri registraciji");
        return;
      }

      setRegisteredEmail(form.email);
      setStep("check_email");
    } catch {
      toast.error("Greška na serveru");
    } finally {
      setLoading(false);
    }
  }

  if (step === "check_email") {
    return (
      <Y2KAuthShell>
        <div className="text-center">
          <div className="text-6xl mb-3">📬</div>
          <h1 className="m-0 font-bagel text-[30px] leading-[0.95] text-y2k-ink">
            Proverite email!
          </h1>
          <p className="text-[#42303a] text-sm mt-3 mb-1 font-medium">
            Poslali smo verifikacioni link na:
          </p>
          <p className="text-y2k-purple font-extrabold text-sm bg-y2k-purple/10 rounded-full py-2 px-4 inline-block mb-5 border-2 border-y2k-ink/10">
            {registeredEmail}
          </p>
          <p className="text-[#7a5a6c] text-xs mb-6 font-medium">
            Kliknite na link u emailu da aktivirate nalog. Link važi 24 sata.
          </p>
          <button
            onClick={async () => {
              const res = await fetch("/api/auth/resend-verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: registeredEmail }),
              });
              if (res.ok) toast.success("Novi link je poslat!");
              else toast.error("Greška pri slanju");
            }}
            className="text-y2k-pink text-sm font-bold hover:underline block mx-auto mb-3"
          >
            Nisam dobio/la email — pošalji ponovo
          </button>
          <Link
            href={`${base}/login`}
            className="text-[#9a7d8b] text-xs hover:underline font-semibold"
          >
            Nazad na prijavu
          </Link>
        </div>
      </Y2KAuthShell>
    );
  }

  return (
    <Y2KAuthShell>
      <Link
        href={`${base}/`}
        className="font-extrabold text-[12px] tracking-[0.12em] uppercase text-y2k-pink"
      >
        ← Nazad na salon
      </Link>
      <div className="font-extrabold text-[11px] tracking-[0.22em] uppercase text-y2k-pink mt-4">
        Members
      </div>
      <h1 className="m-0 font-bagel text-[32px] leading-[0.95] text-y2k-ink">
        Kreiraj nalog
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-5">
        <label className={labelCls}>
          Ime i prezime *
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputCls}
            placeholder="Ana Petrović"
          />
        </label>
        <label className={labelCls}>
          Email *
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className={inputCls}
            placeholder="ana@email.com"
          />
        </label>
        <label className={labelCls}>
          Lozinka *
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            className={inputCls}
            placeholder="Min. 8 karaktera"
          />
        </label>
        <label className={labelCls}>
          Telefon
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            className={inputCls}
            placeholder="+381 60 123 4567"
          />
        </label>
        <label className={labelCls}>
          Instagram
          <div className="mt-1.5 flex items-center rounded-[14px] border-[3px] border-y2k-ink overflow-hidden focus-within:shadow-[3px_3px_0_#8B16C9] transition-shadow">
            <span className="px-3 text-sm text-[#9a7d8b] select-none font-bold">
              @
            </span>
            <input
              type="text"
              value={form.instagram}
              onChange={(e) => set("instagram", e.target.value)}
              className="flex-1 text-y2k-ink px-1 py-3 text-[15px] outline-none"
              placeholder="username"
            />
          </div>
          <p className="text-xs text-[#9a7d8b] mt-1 font-medium normal-case tracking-normal">
            Unesite telefon ili Instagram profil.
          </p>
        </label>

        <label className="flex items-start gap-3 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={form.agreedToPrivacy}
            onChange={(e) => set("agreedToPrivacy", e.target.checked)}
            className="mt-0.5 accent-y2k-pink w-4 h-4"
          />
          <span className="text-sm text-[#42303a] font-medium">
            Prihvatam{" "}
            <Link
              href="/politika-privatnosti"
              className="text-y2k-pink font-bold hover:underline"
            >
              politiku privatnosti
            </Link>
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-1 bg-y2k-pink text-white font-black text-[16px] tracking-[0.04em] uppercase py-3.5 border-[4px] border-y2k-ink rounded-full shadow-[4px_4px_0_#0b0b0f] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#0b0b0f] transition-all duration-200 disabled:opacity-60 cursor-pointer"
        >
          {loading ? "Kreiranje naloga..." : "Kreiraj nalog →"}
        </button>
      </form>

      <p className="text-center text-sm text-[#7a5a6c] mt-5 font-semibold">
        Već imate nalog?{" "}
        <Link
          href={`${base}/login`}
          className="text-y2k-pink font-bold hover:underline"
        >
          Prijavite se
        </Link>
      </p>
    </Y2KAuthShell>
  );
}
