/**
 * AdminCustomDomain — Custom domain management tab in admin dashboard.
 *
 * Features:
 * - Set / remove a custom domain
 * - Displays Vercel verification status with badge
 * - Shows DNS instructions (A record + CNAME alternative)
 * - Displays TXT verification record if Vercel returns one
 * - Refresh button to re-check verification status
 */
"use client";

import { useState, useEffect } from "react";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";

// ─── Style tokens (mirrors dashboard/page.tsx) ─────────────────────────────
const inp =
  "w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white transition placeholder:text-zinc-400";
const lbl =
  "block text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5";
const card = "bg-white rounded-2xl border border-zinc-100 shadow-sm p-6";

// ─── Types ─────────────────────────────────────────────────────────────────

interface VerificationRecord {
  type: string;
  domain: string;
  value: string;
  reason: string;
}

interface DomainStatusResponse {
  customDomain: string | null;
  verified: boolean;
  verification?: VerificationRecord[];
}

// ─── Component ─────────────────────────────────────────────────────────────

export function AdminCustomDomain() {
  const {
    tenant,
    isLoading,
    customDomainInput,
    setCustomDomainInput,
    saveCustomDomain,
    removeCustomDomain,
    isSavingDomain,
  } = useTenantAdmin();

  const [verificationRecords, setVerificationRecords] = useState<
    VerificationRecord[]
  >([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // Sync input with tenant data when it loads
  useEffect(() => {
    if (tenant?.customDomain) {
      setCustomDomainInput(tenant.customDomain);
    }
  }, [tenant?.customDomain, setCustomDomainInput]);

  async function handleRefreshStatus() {
    setIsRefreshing(true);
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch("/api/tenants/custom-domain", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data: DomainStatusResponse = await res.json();
      setVerificationRecords(data.verification ?? []);
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleSave() {
    setConfirmRemove(false);
    saveCustomDomain();
  }

  function handleRemove() {
    setConfirmRemove(false);
    removeCustomDomain();
  }

  if (isLoading) {
    return (
      <div className={card}>
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <span className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin inline-block" />
          Učitavanje podataka o domenu...
        </div>
      </div>
    );
  }

  const hasDomain = !!tenant?.customDomain;
  const isVerified = tenant?.customDomainVerified ?? false;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── Left: Domain input ──────────────────────────────────────────── */}
      <div className={card + " flex flex-col gap-6"}>
        <div>
          <h2 className="text-base font-bold text-zinc-800 mb-0.5">
            Custom domen
          </h2>
          <p className="text-xs text-zinc-400">
            Povežite vaš domen (npr.{" "}
            <code className="bg-zinc-100 px-1 rounded">kikikiss.beauty</code>)
            sa vašim salonom. Vaš sajt će biti dostupan na tom domenu umesto na{" "}
            <code className="bg-zinc-100 px-1 rounded">
              marysoll.com/{tenant?.slug ?? "vas-salon"}
            </code>
            .
          </p>
        </div>

        {/* Current status badge */}
        {hasDomain && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
            <div className="flex-1 min-w-0">
              <p className={lbl + " mb-0.5"}>Trenutni domen</p>
              <p className="text-sm font-semibold text-zinc-800 truncate">
                {tenant.customDomain}
              </p>
            </div>
            {isVerified ? (
              <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Verifikovan
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                Čeka DNS
              </span>
            )}
          </div>
        )}

        {/* Input */}
        <div>
          <label className={lbl}>
            {hasDomain ? "Promeni domen" : "Unesite vaš domen"}
          </label>
          <input
            type="text"
            value={customDomainInput}
            onChange={(e) => setCustomDomainInput(e.target.value)}
            placeholder="kikikiss.beauty"
            className={inp}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          <p className="text-[11px] text-zinc-400 mt-1.5">
            Unesite samo domen bez http:// ili www.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleSave}
            disabled={isSavingDomain || !customDomainInput.trim()}
            className="w-full bg-violet-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-40"
          >
            {isSavingDomain
              ? "Snima se..."
              : hasDomain
                ? "Promeni domen"
                : "Sačuvaj domen"}
          </button>

          {hasDomain && !confirmRemove && (
            <button
              onClick={() => setConfirmRemove(true)}
              className="w-full border border-red-100 text-red-500 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-50 transition"
            >
              Ukloni custom domen
            </button>
          )}

          {confirmRemove && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
              <p className="text-xs text-red-700 font-semibold mb-3">
                Sigurno želite da uklonite custom domen? Vaš salon će biti
                dostupan samo na marysoll.com/{tenant?.slug}.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleRemove}
                  disabled={isSavingDomain}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-red-700 transition disabled:opacity-40"
                >
                  Da, ukloni
                </button>
                <button
                  onClick={() => setConfirmRemove(false)}
                  className="flex-1 border border-zinc-200 text-zinc-600 py-2 rounded-lg text-xs font-semibold hover:bg-zinc-50 transition"
                >
                  Odustani
                </button>
              </div>
            </div>
          )}

          {hasDomain && !isVerified && (
            <button
              onClick={handleRefreshStatus}
              disabled={isRefreshing}
              className="w-full border border-zinc-200 text-zinc-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-50 transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isRefreshing && (
                <span className="w-3.5 h-3.5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin inline-block" />
              )}
              Provjeri verifikaciju
            </button>
          )}
        </div>
      </div>

      {/* ── Right: DNS instructions ──────────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        {/* DNS records */}
        <div className={card}>
          <h3 className="text-sm font-bold text-zinc-800 mb-1">
            DNS podešavanja
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Dodajte jedan od sledećih zapisa kod vašeg registrara domena
            (GoDaddy, Namecheap, Cloudflare, itd.).
          </p>

          {/* A record */}
          <div className="mb-4">
            <p className={lbl}>Opcija 1 — A zapis (preporučeno)</p>
            <div className="rounded-xl bg-zinc-50 border border-zinc-100 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="text-left px-3.5 py-2 text-zinc-400 font-semibold">
                      Tip
                    </th>
                    <th className="text-left px-3.5 py-2 text-zinc-400 font-semibold">
                      Ime
                    </th>
                    <th className="text-left px-3.5 py-2 text-zinc-400 font-semibold">
                      Vrednost
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3.5 py-2.5">
                      <code className="font-bold text-violet-600">A</code>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <code className="font-mono text-zinc-700">@</code>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <code className="font-mono text-zinc-700 select-all">
                        76.76.21.21
                      </code>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* CNAME record */}
          <div>
            <p className={lbl}>Opcija 2 — CNAME zapis (ako registrar podržava)</p>
            <div className="rounded-xl bg-zinc-50 border border-zinc-100 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="text-left px-3.5 py-2 text-zinc-400 font-semibold">
                      Tip
                    </th>
                    <th className="text-left px-3.5 py-2 text-zinc-400 font-semibold">
                      Ime
                    </th>
                    <th className="text-left px-3.5 py-2 text-zinc-400 font-semibold">
                      Vrednost
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3.5 py-2.5">
                      <code className="font-bold text-violet-600">CNAME</code>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <code className="font-mono text-zinc-700">@</code>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <code className="font-mono text-zinc-700 select-all">
                        cname.vercel-dns.com
                      </code>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 mt-3 leading-relaxed">
            DNS promene mogu da traju do 48 sati. Nakon podešavanja kliknite
            &quot;Provjeri verifikaciju&quot; da potvrdite.
          </p>
        </div>

        {/* TXT verification records (returned by Vercel when domain ownership not proven) */}
        {verificationRecords.length > 0 && (
          <div className={card}>
            <h3 className="text-sm font-bold text-zinc-800 mb-1">
              Dodatna verifikacija
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Vercel zahteva dodatni TXT zapis za potvrdu vlasništva nad
              domenom.
            </p>
            <div className="rounded-xl bg-amber-50 border border-amber-100 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-amber-100">
                    <th className="text-left px-3.5 py-2 text-amber-600 font-semibold">
                      Tip
                    </th>
                    <th className="text-left px-3.5 py-2 text-amber-600 font-semibold">
                      Ime
                    </th>
                    <th className="text-left px-3.5 py-2 text-amber-600 font-semibold">
                      Vrednost
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {verificationRecords.map((rec, i) => (
                    <tr
                      key={i}
                      className={
                        i > 0 ? "border-t border-amber-100" : undefined
                      }
                    >
                      <td className="px-3.5 py-2.5">
                        <code className="font-bold text-amber-700">
                          {rec.type}
                        </code>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <code className="font-mono text-zinc-700 break-all">
                          {rec.domain}
                        </code>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <code className="font-mono text-zinc-700 break-all select-all">
                          {rec.value}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* How it works */}
        <div className={card}>
          <h3 className="text-sm font-bold text-zinc-800 mb-3">
            Kako funkcioniše
          </h3>
          <ol className="space-y-2.5 text-xs text-zinc-500 list-none">
            {[
              "Unesite vaš domen (npr. kikikiss.beauty) u polje iznad",
              "Dodajte A ili CNAME zapis kod registrara vašeg domena",
              "Sačekajte do 48h da se DNS promene propagiraju",
              "Kliknite \"Provjeri verifikaciju\" — status će se automatski ažurirati",
              "Kada je domen verifikovan, vaši klijenti mogu da vas posete direktno na vašem domenu",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-600 font-bold text-[10px] flex items-center justify-center">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
