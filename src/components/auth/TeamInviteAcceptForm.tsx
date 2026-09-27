"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export function TeamInviteAcceptForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Lozinka mora imati najmanje 8 karaktera.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Lozinke se ne podudaraju.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/team/invitations/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Aktivacija nije uspela.");
      setAccepted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Aktivacija nije uspela.");
    } finally {
      setSubmitting(false);
    }
  }

  if (accepted) {
    return (
      <div className="space-y-5 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Nalog je aktiviran</h1>
        <p className="text-sm leading-6 text-gray-600">
          Lozinka je sačuvana. Sada možete da se prijavite kao član tima.
        </p>
        <Link
          href="/login"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700"
        >
          Idi na prijavu
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Aktivirajte nalog</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Postavite svoju lozinku da biste pristupili salonu kao član tima.
        </p>
      </div>
      {!token && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Link za aktivaciju nije validan.
        </p>
      )}
      <label className="block text-sm font-medium text-gray-700">
        Lozinka
        <input
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
        />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        Ponovite lozinku
        <input
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!token || submitting}
        className="min-h-12 w-full rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Aktiviranje…" : "Aktiviraj nalog"}
      </button>
    </form>
  );
}
