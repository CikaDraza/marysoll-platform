"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ResendVerificationForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Greška");
        return;
      }
      setSent(true);
    } catch {
      toast.error("Greška na serveru");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md text-center">
        <span className="text-2xl font-bold text-purple-600 block mb-8">
          Marysoll
        </span>

        {sent ? (
          <>
            <div className="text-5xl mb-4">📬</div>
            <h1 className="text-7xl font-bold text-gray-900 mb-3">
              Email je poslat!
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              Proverite inbox za <strong>{email}</strong>. Link važi 24 sata.
            </p>
            <Link
              href="/login"
              className="text-purple-600 text-sm hover:underline"
            >
              Nazad na prijavu
            </Link>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">📧</div>
            <h1 className="text-7xl font-bold text-gray-900 mb-2">
              Pošalji novi link
            </h1>
            <p className="text-gray-500 text-sm mb-8">
              Unesite email sa kojim ste se registrovali.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vas@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 text-white py-2.5 rounded-xl font-semibold hover:bg-purple-700 transition disabled:opacity-50"
              >
                {loading ? "Slanje..." : "Pošalji link →"}
              </button>
            </form>
            <Link
              href="/login"
              className="text-gray-400 text-xs mt-6 block hover:underline"
            >
              Nazad na prijavu
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
