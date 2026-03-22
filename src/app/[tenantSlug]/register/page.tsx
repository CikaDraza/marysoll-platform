/**
 * /[tenantSlug]/register — Registracija klijenta salona.
 * Nema "Registruj salon" opcije — samo klijentski nalog.
 */
"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

type Step = "form" | "check_email";

export default function ClientRegisterPage() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;

  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
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
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
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

  if (step === "check_email") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md text-center">
          <Link href={`/${tenantSlug}`} className="text-sm text-purple-600 font-semibold block mb-6">
            ← Nazad na salon
          </Link>
          <div className="text-6xl mb-4">📬</div>
          <h1 className="text-xl font-bold text-gray-900 mb-3">Proverite email!</h1>
          <p className="text-gray-500 text-sm mb-2">Poslali smo verifikacioni link na:</p>
          <p className="text-purple-700 font-semibold text-sm bg-purple-50 rounded-lg py-2 px-4 inline-block mb-6">
            {registeredEmail}
          </p>
          <p className="text-gray-400 text-xs mb-8">
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
            className="text-purple-600 text-sm hover:underline block mx-auto mb-4"
          >
            Nisam dobio/la email — pošalji ponovo
          </button>
          <Link href={`/${tenantSlug}/login`} className="text-gray-400 text-xs hover:underline">
            Nazad na prijavu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 py-12 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href={`/${tenantSlug}`} className="text-sm text-purple-600 font-semibold block mb-3">
            ← Nazad na salon
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Kreiraj nalog</h1>
          <p className="text-gray-500 text-sm mt-1">
            Registrujte se da biste zakazivali termine
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ime i prezime *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Ana Petrović"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="ana@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lozinka *</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
              </Link>
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition disabled:opacity-50 text-sm"
          >
            {loading ? "Kreiranje naloga..." : "Kreiraj nalog →"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Već imate nalog?{" "}
          <Link href={`/${tenantSlug}/login`} className="text-purple-600 font-medium hover:underline">
            Prijavite se
          </Link>
        </p>
      </div>
    </div>
  );
}
