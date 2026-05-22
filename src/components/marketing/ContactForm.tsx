"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDownIcon } from "@heroicons/react/16/solid";

export interface ContactFormProps {
  headline?: string;
  subheadline?: string;
  primaryColor?: string;
  secondaryColor?: string;
  /** POST endpoint — defaults to /api/public/contact */
  action?: string;
}

const COUNTRY_CODES = [
  { code: "+381", flag: "RS" },
  { code: "+387", flag: "BA" },
  { code: "+385", flag: "HR" },
  { code: "+386", flag: "SI" },
  { code: "+43", flag: "AT" },
  { code: "+49", flag: "DE" },
];

export function ContactForm({
  headline = "Kontaktirajte nas",
  subheadline = "Imate pitanje? Pišite nam — odgovaramo u roku od jednog radnog dana.",
  primaryColor = "#9089fc",
  secondaryColor = "#ff80b5",
  action = "/api/public/contact",
}: ContactFormProps) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    countryCode: "+381",
    phone: "",
    message: "",
    agreed: false,
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function onChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.agreed) {
      setErrorMsg("Morate prihvatiti politiku privatnosti.");
      return;
    }
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch(action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.countryCode + form.phone,
          message: form.message,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? "Greška pri slanju.");
      }
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Greška pri slanju.");
    }
  }

  const focusRing = `focus:outline-2 focus:-outline-offset-2`;
  const inputBase = `block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 ${focusRing}`;

  if (status === "sent") {
    return (
      <div className="isolate bg-white px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6"
            style={{ background: `linear-gradient(135deg, ${secondaryColor}, ${primaryColor})` }}
          >
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Poruka poslata!
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Hvala vam na poruci. Javićemo vam se u roku od jednog radnog dana.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="isolate bg-white px-6 py-24 sm:py-32 lg:px-8">
      {/* Decorative blob */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80 pointer-events-none"
      >
        <div
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            background: `linear-gradient(to top right, ${secondaryColor}, ${primaryColor})`,
          }}
          className="relative left-1/2 -z-10 aspect-[1155/678] w-[36.125rem] max-w-none -translate-x-1/2 rotate-[30deg] opacity-30 sm:left-[calc(50%-40rem)] sm:w-[72.1875rem]"
        />
      </div>

      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-4xl font-semibold tracking-tight text-balance text-gray-900 sm:text-5xl">
          {headline}
        </h2>
        <p className="mt-2 text-lg/8 text-gray-600">{subheadline}</p>
      </div>

      <form onSubmit={onSubmit} className="mx-auto mt-16 max-w-xl sm:mt-20">
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          {/* First name */}
          <div>
            <label htmlFor="firstName" className="block text-sm/6 font-semibold text-gray-900">
              Ime
            </label>
            <div className="mt-2.5">
              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                required
                value={form.firstName}
                onChange={onChange}
                className={inputBase}
                style={{ ["--tw-ring-color" as string]: primaryColor }}
              />
            </div>
          </div>

          {/* Last name */}
          <div>
            <label htmlFor="lastName" className="block text-sm/6 font-semibold text-gray-900">
              Prezime
            </label>
            <div className="mt-2.5">
              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                required
                value={form.lastName}
                onChange={onChange}
                className={inputBase}
              />
            </div>
          </div>

          {/* Email */}
          <div className="sm:col-span-2">
            <label htmlFor="email" className="block text-sm/6 font-semibold text-gray-900">
              Email adresa
            </label>
            <div className="mt-2.5">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={onChange}
                className={inputBase}
              />
            </div>
          </div>

          {/* Phone */}
          <div className="sm:col-span-2">
            <label htmlFor="phone" className="block text-sm/6 font-semibold text-gray-900">
              Broj telefona <span className="font-normal text-gray-400">(opciono)</span>
            </label>
            <div className="mt-2.5">
              <div className="flex rounded-md bg-white outline-1 -outline-offset-1 outline-gray-300 has-[input:focus-within]:outline-2 has-[input:focus-within]:-outline-offset-2">
                <div className="grid shrink-0 grid-cols-1 focus-within:relative">
                  <select
                    id="countryCode"
                    name="countryCode"
                    aria-label="Pozivni broj"
                    value={form.countryCode}
                    onChange={onChange}
                    className="col-start-1 row-start-1 w-full appearance-none rounded-l-md py-2 pr-7 pl-3.5 text-base text-gray-500 focus:outline-2 focus:-outline-offset-2 sm:text-sm/6 bg-transparent"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                  />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="060 123 4567"
                  value={form.phone}
                  onChange={onChange}
                  className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                />
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="sm:col-span-2">
            <label htmlFor="message" className="block text-sm/6 font-semibold text-gray-900">
              Poruka
            </label>
            <div className="mt-2.5">
              <textarea
                id="message"
                name="message"
                rows={4}
                required
                value={form.message}
                onChange={onChange}
                className={inputBase}
              />
            </div>
          </div>

          {/* Privacy checkbox */}
          <div className="flex gap-x-4 sm:col-span-2">
            <div className="flex h-6 items-center">
              <div
                className="group relative inline-flex w-8 shrink-0 rounded-full bg-gray-200 p-px inset-ring inset-ring-gray-900/5 outline-offset-2 transition-colors duration-200 ease-in-out has-checked:bg-opacity-100"
                style={{ ["--checked-bg" as string]: primaryColor }}
              >
                <span
                  className="size-4 rounded-full bg-white shadow-xs ring-1 ring-gray-900/5 transition-transform duration-200 ease-in-out group-has-checked:translate-x-3.5"
                  style={{ background: form.agreed ? primaryColor : undefined }}
                />
                <input
                  id="agreed"
                  name="agreed"
                  type="checkbox"
                  aria-label="Prihvatam politiku privatnosti"
                  checked={form.agreed}
                  onChange={onChange}
                  className="absolute inset-0 size-full appearance-none focus:outline-hidden cursor-pointer"
                />
              </div>
            </div>
            <label htmlFor="agreed" className="text-sm/6 text-gray-600">
              Slanjem poruke prihvatate našu{" "}
              <Link href="/privacy" className="font-semibold whitespace-nowrap" style={{ color: primaryColor }}>
                politiku privatnosti
              </Link>
              .
            </label>
          </div>
        </div>

        {errorMsg && (
          <p className="mt-4 text-sm text-red-600">{errorMsg}</p>
        )}

        <div className="mt-10">
          <button
            type="submit"
            disabled={status === "sending"}
            className="block w-full rounded-md px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-xs transition-opacity disabled:opacity-60"
            style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
          >
            {status === "sending" ? "Slanje…" : "Pošalji poruku"}
          </button>
        </div>
      </form>
    </div>
  );
}
