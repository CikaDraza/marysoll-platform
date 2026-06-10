"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

type Step = "form" | "check_email";

type FormFields = {
  salonName: string;
  ownerName: string;
  email: string;
  password: string;
  phone: string;
  agreedToPrivacy: boolean;
  newsletterOptIn: boolean;
};

type FieldErrors = Partial<Record<keyof FormFields, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form: FormFields): FieldErrors {
  const e: FieldErrors = {};
  if (!form.salonName.trim()) e.salonName = "Naziv salona je obavezan";
  if (!form.ownerName.trim()) e.ownerName = "Ime i prezime je obavezno";
  if (!form.email.trim()) {
    e.email = "Email je obavezan";
  } else if (!EMAIL_RE.test(form.email)) {
    e.email = "Unesite ispravnu email adresu";
  }
  if (!form.password) {
    e.password = "Lozinka je obavezna";
  } else if (form.password.length < 8) {
    e.password = "Lozinka mora imati najmanje 8 karaktera";
  }
  if (!form.phone.trim()) e.phone = "Telefon je obavezan";
  if (!form.agreedToPrivacy) e.agreedToPrivacy = "Morate prihvatiti politiku privatnosti";
  return e;
}

export default function RegisterForm() {
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [form, setForm] = useState<FormFields>({
    salonName: "",
    ownerName: "",
    email: "",
    password: "",
    phone: "",
    agreedToPrivacy: false,
    newsletterOptIn: false,
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  function set<K extends keyof FormFields>(field: K, value: FormFields[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
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
        <h1 className="text-xl font-bold text-gray-900 mb-3">
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
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Naziv salona
          </label>
          <input
            type="text"
            value={form.salonName}
            onChange={(e) => set("salonName", e.target.value)}
            className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition ${
              errors.salonName ? "border-red-400 bg-red-50" : "border-gray-200"
            }`}
            placeholder="Nail Studio Anja"
            disabled={loading}
          />
          {errors.salonName && (
            <p className="text-red-500 text-xs mt-1">{errors.salonName}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vaše ime i prezime
          </label>
          <input
            type="text"
            value={form.ownerName}
            onChange={(e) => set("ownerName", e.target.value)}
            className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition ${
              errors.ownerName ? "border-red-400 bg-red-50" : "border-gray-200"
            }`}
            placeholder="Anja Petrović"
            disabled={loading}
          />
          {errors.ownerName && (
            <p className="text-red-500 text-xs mt-1">{errors.ownerName}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition ${
              errors.email ? "border-red-400 bg-red-50" : "border-gray-200"
            }`}
            placeholder="anja@salon.com"
            disabled={loading}
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lozinka
          </label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition ${
              errors.password ? "border-red-400 bg-red-50" : "border-gray-200"
            }`}
            placeholder="Min. 8 karaktera"
            disabled={loading}
          />
          {errors.password && (
            <p className="text-red-500 text-xs mt-1">{errors.password}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefon
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition ${
              errors.phone ? "border-red-400 bg-red-50" : "border-gray-200"
            }`}
            placeholder="+381 60 123 4567"
            disabled={loading}
          />
          {errors.phone && (
            <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
          )}
        </div>

        <div>
          <label className="flex items-start gap-3 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={form.newsletterOptIn}
              onChange={(e) => set("newsletterOptIn", e.target.checked)}
              className="mt-0.5 accent-purple-600"
              disabled={loading}
            />
            <span className="text-sm text-gray-600">
              Želim da primam obaveštenja i promocije{" "}
              <span className="text-gray-400">(opciono)</span>
            </span>
          </label>
        </div>

        <div>
          <label className="flex items-start gap-3 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={form.agreedToPrivacy}
              onChange={(e) => set("agreedToPrivacy", e.target.checked)}
              className="mt-0.5 accent-purple-600"
              disabled={loading}
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
          {errors.agreedToPrivacy && (
            <p className="text-red-500 text-xs mt-1">{errors.agreedToPrivacy}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          )}
          {loading ? "Kreiranje salona..." : "Kreiraj salon →"}
        </button>
      </form>

      <div className="mt-4 p-3 bg-purple-50 rounded-lg text-xs text-purple-700 text-center">
        🌐 Dobićete subdomen: <strong>naziv-salona.marysoll.com</strong>
      </div>
    </div>
  );
}
