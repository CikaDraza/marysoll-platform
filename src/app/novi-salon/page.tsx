"use client";

/**
 * /novi-salon — vlasnica je prijavljena, ali nema salon.
 *
 * Nastaje kada obriše salon a zadrži nalog (namerno odvojeni), pa želi da
 * napravi drugi. Do ove strane vodi `loginRedirectUrl` kada token nema tenant
 * kontekst; `/dashboard` ovde ne bi radio jer njegov guard traži `isAdmin`.
 */
import { useEffect, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { getRawToken } from "@/lib/auth/auth-client";

export default function NoviSalonPage() {
  const { user, isLoading, logout } = useAuth();
  const [salonName, setSalonName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) window.location.replace("/login");
    // Ako nalog IMA salon, ovde nema šta da se radi.
    if (!isLoading && user?.tenantId) window.location.replace("/dashboard");
  }, [isLoading, user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tenants/create-for-me", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getRawToken() ?? ""}`,
        },
        body: JSON.stringify({ salonName, ownerName }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Salon nije napravljen.");
        return;
      }
      // Token još nema tenant kontekst — nova prijava ga donosi.
      logout();
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || !user) return null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12 dark:bg-gray-950">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <Image
            src="/marysoll_elegant_logo.png"
            alt="Marysoll"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-violet-500">
              Marysoll
            </p>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Napravite svoj salon
            </h1>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
            Vaš nalog je aktivan, ali nema salon
          </p>
          <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-200/70">
            Prijavljeni ste kao <strong>{user.email}</strong>. Napravite salon da
            biste otvorili panel — profil, usluge i termine.
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Ime salona
            </label>
            <input
              required
              minLength={2}
              value={salonName}
              onChange={(e) => setSalonName(e.target.value)}
              placeholder="npr. Lash Room by Anja"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Vaše ime
            </label>
            <input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="npr. Anja"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || salonName.trim().length < 2}
            className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-40"
          >
            {busy ? "Pravim salon…" : "Napravi salon"}
          </button>

          <button
            type="button"
            onClick={() => logout()}
            className="w-full text-center text-xs text-gray-500 underline underline-offset-2 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Odjavi se
          </button>
        </form>
      </div>
    </main>
  );
}
