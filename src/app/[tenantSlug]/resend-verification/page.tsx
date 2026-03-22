"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ClientResendVerificationPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) setSent(true);
      else toast.error("Greška");
    } catch {
      toast.error("Greška na serveru");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        <Link href={`/${tenantSlug}/login`} className="text-sm text-purple-600 font-semibold block mb-6">← Nazad</Link>
        {sent ? (
          <>
            <div className="text-5xl mb-4">📬</div>
            <h1 className="text-lg font-bold text-gray-900 mb-2">Link je poslat!</h1>
            <p className="text-gray-500 text-sm mb-4">Proverite inbox za <strong>{email}</strong>. Link važi 24 sata.</p>
            <Link href={`/${tenantSlug}/login`} className="text-purple-600 text-sm hover:underline">Prijavi se</Link>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">📧</div>
            <h1 className="text-lg font-bold text-gray-900 mb-2">Pošalji novi link</h1>
            <form onSubmit={handleSubmit} className="space-y-4 mt-6 text-left">
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="vas@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
              <button type="submit" disabled={loading}
                className="w-full bg-purple-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-purple-700 transition disabled:opacity-50">
                {loading ? "Slanje..." : "Pošalji link →"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
