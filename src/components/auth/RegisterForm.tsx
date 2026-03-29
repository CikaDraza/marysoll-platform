"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

type Step = "form" | "check_email";

export default function RegisterForm() {
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [form, setForm] = useState({
    salonName: "",
    ownerName: "",
    email: "",
    password: "",
    phone: "",
    agreedToPrivacy: false,
  });

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.agreedToPrivacy) {
      toast.error("Morate prihvatiti politiku privatnosti");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/tenants/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

  // ─── Korak 2: Proveri email ───────────────────────────────────────────────
  if (step === "check_email") {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-10 w-full text-center">
        <Link
          href="/"
          className="text-2xl font-bold text-purple-600 block mb-8"
        >
          Marysoll
        </Link>
        <div className="text-6xl mb-4">📬</div>
        <h1 className="text-7xl font-bold text-gray-900 mb-3">
          Proverite email!
        </h1>
        <p className="text-gray-500 text-sm mb-2">
          Poslali smo verifikacioni link na:
        </p>
        <p className="text-purple-700 font-semibold text-sm mb-6 bg-purple-50 rounded-lg py-2 px-4 inline-block">
          {registeredEmail}
        </p>
        <p className="text-gray-400 text-xs mb-8">
          Kliknite na link u emailu da aktivirate salon i pokrenete 30-dnevni
          probni period. Link važi 24 sata.
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
          className="text-purple-600 text-sm hover:underline block mx-auto mb-4"
        >
          Nisam dobio/la email — pošalji ponovo
        </button>
        <Link href="/login" className="text-gray-400 text-xs hover:underline">
          Nazad na prijavu
        </Link>
      </div>
    );
  }

  // ─── Korak 1: Forma ───────────────────────────────────────────────────────
  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Naziv salona
          </label>
          <input
            type="text"
            required
            value={form.salonName}
            onChange={(e) => set("salonName", e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            placeholder="Nail Studio Anja"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vaše ime i prezime
          </label>
          <input
            type="text"
            required
            value={form.ownerName}
            onChange={(e) => set("ownerName", e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            placeholder="Anja Petrović"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            placeholder="anja@salon.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lozinka
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            placeholder="Min. 8 karaktera"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefon <span className="text-gray-400 font-normal">(opciono)</span>
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            placeholder="+381 60 123 4567"
          />
        </div>

        <label className="flex items-start gap-3 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={form.agreedToPrivacy}
            onChange={(e) => set("agreedToPrivacy", e.target.checked)}
            className="mt-0.5 accent-purple-600"
          />
          <span className="text-sm text-gray-600">
            Prihvatam{" "}
            <Link href="/privacy" className="text-purple-600 hover:underline">
              politiku privatnosti
            </Link>{" "}
            i{" "}
            <Link href="/terms" className="text-purple-600 hover:underline">
              uslove korišćenja
            </Link>
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700 transition disabled:opacity-50"
        >
          {loading ? "Kreiranje salona..." : "Kreiraj salon →"}
        </button>
      </form>

      <div className="mt-4 p-3 bg-purple-50 rounded-lg text-xs text-purple-700 text-center">
        🌐 Dobićete subdomen: <strong>naziv-salona.marysoll.com</strong>
      </div>
    </div>
  );
}
