/**
 * AdminCustomDomain — Custom domain management tab in admin dashboard.
 *
 * Features:
 * - Domain availability search via Vercel API → redirect to purchase
 * - Set / remove a custom domain
 * - Vercel DNS verification status with badge
 * - DNS instructions (A record + CNAME alternative)
 * - TXT verification records if Vercel returns them
 * - Fallback warning when customDomainVerified is false — shows path-based URL
 */
"use client";

import { useState, useEffect } from "react";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import type { DomainSearchResult } from "@/hooks/useTenantAdmin";
import { platformOrigin } from "@/lib/platform/host-context";

// ─── Style tokens (mirrors dashboard/page.tsx) ─────────────────────────────

const inp = [
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm",
  "text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800",
  "focus:outline-none focus:ring-2 focus:ring-violet-400 transition",
  "placeholder:text-gray-400 dark:placeholder:text-gray-500",
].join(" ");

const lbl =
  "block text-[11px] font-bold text-gray-400 dark:text-gray-300 uppercase tracking-widest mb-1.5";
const card =
  "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6";

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
    domainSearchInput,
    setDomainSearchInput,
    searchDomain,
    domainSearchResult,
    clearDomainSearch,
    isSearchingDomain,
    verifyDomain,
    isVerifying,
    lastVerification,
    verifyInbox,
    isVerifyingInbox,
    lastInboxVerification,
  } = useTenantAdmin();

  const [confirmRemove, setConfirmRemove] = useState(false);

  const [domainSearchError, setDomainSearchError] = useState<string | null>(
    null,
  );

  // Sync input with tenant data when it loads
  useEffect(() => {
    if (tenant?.customDomain) {
      setCustomDomainInput(tenant.customDomain);
    }
  }, [tenant?.customDomain, setCustomDomainInput]);

  // When user picks a searched domain, prefill the save input
  function handleUseDomain(result: DomainSearchResult) {
    setCustomDomainInput(result.name);
    clearDomainSearch();
  }

  function handleSearch() {
    const val = domainSearchInput.trim().toLowerCase();
    if (!val.includes(".")) {
      setDomainSearchError(
        `Unesite pun domen sa ekstenzijom — npr. ${val || "moj-salon"}.com ili ${val || "moj-salon"}.beauty`,
      );
      return;
    }
    setDomainSearchError(null);
    searchDomain();
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
  const expectedInbox = hasDomain ? `booking@${tenant.customDomain}` : "";
  const bookingInboxVerified = expectedInbox
    ? (tenant?.verifiedInboxEmails ?? []).includes(expectedInbox)
    : false;
  const inboxMessage = bookingInboxVerified
    ? `${expectedInbox} verified`
    : expectedInbox
      ? `${expectedInbox} not verified`
      : "Not configured";
  const emailProviderLabel =
    tenant?.emailHostingProvider === "zoho"
      ? "Zoho Mail"
      : tenant?.emailHostingProvider === "google"
        ? "Google Workspace"
        : tenant?.emailHostingProvider === "microsoft"
          ? "Microsoft 365"
          : tenant?.emailHostingProvider === "other"
            ? "Email hosting"
            : "Inbox";
  const emailHostingDetected =
    tenant?.emailHostingStatus === "mx_detected" ||
    tenant?.emailHostingStatus === "verified";
  const inboxLevel =
    tenant?.emailHostingStatus === "verified"
      ? "Level 3: Verified inbox"
      : emailHostingDetected
        ? "Level 2: MX detected"
        : "Level 1: Reply-To only";

  // Path-based fallback URL — always available regardless of custom domain status
  const platformHost = platformOrigin().replace(/^https?:\/\//, "");
  const pathBasedUrl = tenant?.slug ? `${platformOrigin()}/${tenant.slug}` : null;

  // Show fallback warning if domain set but NOT verified
  const showFallbackWarning = hasDomain && !isVerified;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── Left column ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        {/* ── Unverified domain fallback warning ─────────────────────────── */}
        {showFallbackWarning && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <span className="text-amber-500 text-lg mt-0.5 flex-shrink-0">
                ⚠️
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-amber-800 mb-1">
                  Custom domen nije verifikovan
                </p>
                <p className="text-xs text-amber-700 leading-relaxed mb-3">
                  Domen{" "}
                  <code className="bg-amber-100 px-1 rounded font-mono">
                    {tenant.customDomain}
                  </code>{" "}
                  je sačuvan ali DNS verifikacija nije potvrđena. Salon je
                  trenutno dostupan na path-based URL-u:
                </p>
                {pathBasedUrl && (
                  <a
                    href={pathBasedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2"
                  >
                    {pathBasedUrl}
                    <svg
                      className="w-3 h-3 opacity-60"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        d="M2 10L10 2M10 2H4M10 2v6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Domain search card ──────────────────────────────────────────── */}
        <div className={card + " flex flex-col gap-5"}>
          <div>
            <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-200 mb-0.5">
              Proveri dostupnost domena
            </h2>
            <p className="text-xs text-zinc-400">
              Saznajte da li je domen slobodan i koliko košta, pa ga kupite
              direktno na Vercel-u.
            </p>
          </div>

          <div>
            <label className={lbl}>Unesite željeni domen</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={domainSearchInput}
                onChange={(e) => {
                  setDomainSearchInput(e.target.value);
                  setDomainSearchError(null);
                  if (domainSearchResult) clearDomainSearch();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && domainSearchInput.trim())
                    handleSearch();
                }}
                placeholder="kikikiss.beauty"
                className={inp}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
              <button
                onClick={handleSearch}
                disabled={isSearchingDomain || !domainSearchInput.trim()}
                className="flex-shrink-0 px-4 py-3 bg-zinc-800 dark:bg-zinc-950 text-gray-200 text-sm font-semibold rounded-xl hover:bg-zinc-900 hover:text-white transition disabled:opacity-40 flex items-center gap-2"
              >
                {isSearchingDomain ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                ) : (
                  "Proveri"
                )}
              </button>
            </div>
            {domainSearchError && (
              <p className="text-[11px] text-red-500 mt-1.5 leading-relaxed">
                {domainSearchError}
              </p>
            )}
          </div>

          {/* Search result */}
          {domainSearchResult && (
            <div
              className={`rounded-xl border p-4 ${
                domainSearchResult.available
                  ? "border-emerald-100 bg-emerald-50"
                  : "border-red-100 bg-red-50"
              }`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-bold text-zinc-800">
                    {domainSearchResult.name}
                  </p>
                  {domainSearchResult.available ? (
                    <p className="text-xs text-emerald-700 mt-0.5">
                      ✅ Slobodan
                      {domainSearchResult.price !== null && (
                        <span className="ml-1.5 font-semibold">
                          — ${domainSearchResult.price}/god
                          {domainSearchResult.premium && (
                            <span className="ml-1 text-amber-600">
                              (premium)
                            </span>
                          )}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-xs text-red-700 mt-0.5">
                      ❌ Zauzet — domen nije dostupan za kupovinu
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {domainSearchResult.available && (
                    <>
                      <a
                        href={domainSearchResult.purchaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-zinc-800 transition flex items-center gap-1.5"
                      >
                        Kupi na Vercel
                        <svg
                          className="w-3 h-3 opacity-70"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <path
                            d="M2 10L10 2M10 2H4M10 2v6"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </a>
                      <button
                        onClick={() => handleUseDomain(domainSearchResult)}
                        className="px-3.5 py-2 border border-violet-200 text-violet-700 text-xs font-semibold rounded-lg hover:bg-violet-50 transition"
                      >
                        Koristi ovaj domen
                      </button>
                    </>
                  )}
                  <button
                    onClick={clearDomainSearch}
                    className="text-xs text-zinc-400 hover:text-zinc-600 transition"
                  >
                    Zatvori
                  </button>
                </div>
              </div>

              {domainSearchResult.available && (
                <p className="text-[11px] text-zinc-400 mt-3 leading-relaxed">
                  Nakon kupovine kliknite &quot;Koristi ovaj domen&quot; da ga
                  dodate u panel, ili ga ručno unesite ispod.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Add / manage domain card ────────────────────────────────────── */}
        <div className={card + " flex flex-col gap-6"}>
          <div>
            <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-200 mb-0.5">
              Poveži custom domen
            </h2>
            <p className="text-xs text-zinc-400">
              Unesite domen koji ste kupili. Vaš salon će biti dostupan na{" "}
              <code className="bg-zinc-100 dark:bg-zinc-800 p-1 rounded">
                kikikiss.beauty
              </code>{" "}
              umesto na{" "}
              <code className="bg-zinc-100 dark:bg-zinc-800 p-1 rounded">
                {platformHost}/{tenant?.slug ?? "vas-salon"}
              </code>
              .
            </p>
          </div>

          {/* Current status badge */}
          {hasDomain && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800">
              <div className="flex-1 min-w-0">
                <p className={lbl + " mb-0.5"}>Trenutni domen</p>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-50 truncate">
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

          {hasDomain && (
            <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                <DomainHealthRow
                  label="Website"
                  ok={isVerified}
                  text={
                    isVerified ? "Connected to Vercel" : "Waiting for Vercel"
                  }
                />
                <DomainHealthRow
                  label="Email"
                  ok={emailHostingDetected}
                  text={
                    emailHostingDetected
                      ? `Email hosting detected: ${emailProviderLabel}`
                      : "Inbox is not configured"
                  }
                />
                <DomainHealthRow
                  label="Sending"
                  ok={tenant.hasResendApiKey}
                  text={
                    tenant.hasResendApiKey
                      ? "Resend verified"
                      : "Resend not verified"
                  }
                />
                <DomainHealthRow
                  label="Inbox"
                  ok={bookingInboxVerified}
                  text={`${inboxLevel} · ${inboxMessage}`}
                />
              </div>
              {!emailHostingDetected && (
                <p className="mb-3 text-xs font-medium text-amber-600">
                  Inbox is not configured. Replies will go to salon contact
                  email.
                </p>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className={lbl + " mb-0.5"}>Inbox verification</p>
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-50">
                    {tenant.emailInboxStatus === "mailbox_verified"
                      ? "Mailbox verified"
                      : tenant.emailInboxStatus === "mx_detected"
                        ? "Zoho domain detected"
                        : "Not configured"}
                  </p>
                  {tenant.verifiedInboxEmails.length > 0 && (
                    <p className="mt-1 text-xs text-emerald-600 truncate">
                      {tenant.verifiedInboxEmails.join(", ")}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => verifyInbox()}
                  disabled={isVerifyingInbox}
                  className="border border-zinc-200 text-zinc-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white dark:hover:bg-zinc-900 transition disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {isVerifyingInbox && (
                    <span className="w-3.5 h-3.5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin inline-block" />
                  )}
                  {isVerifyingInbox ? "Checking..." : "Verify inbox"}
                </button>
              </div>

              {lastInboxVerification?.results?.length ? (
                <div className="mt-3 space-y-2">
                  {lastInboxVerification.results.map((result) => (
                    <p
                      key={result.email}
                      className={
                        result.exists
                          ? "text-xs font-medium text-emerald-600"
                          : "text-xs font-medium text-amber-600"
                      }
                    >
                      {result.message}
                      {!result.exists && (
                        <span className="text-zinc-500 dark:text-zinc-400">
                          {" "}
                          ({result.email})
                        </span>
                      )}
                    </p>
                  ))}
                </div>
              ) : null}
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
          <div className="flex flex-col lg:flex-row gap-2">
            {!confirmRemove && (
              <button
                onClick={handleSave}
                disabled={isSavingDomain || !customDomainInput.trim()}
                className="flex-1 bg-violet-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-40"
              >
                {isSavingDomain
                  ? "Snima se..."
                  : hasDomain
                    ? "Promeni domen"
                    : "Sačuvaj domen"}
              </button>
            )}

            {hasDomain && !isVerified && (
              <button
                onClick={() => verifyDomain()}
                disabled={isVerifying}
                className="flex-1 border border-zinc-200 text-zinc-600 px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-50 transition disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isVerifying && (
                  <span className="w-3.5 h-3.5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin inline-block" />
                )}
                {isVerifying ? "Provera..." : "Proveri verifikaciju"}
              </button>
            )}

            {hasDomain && !confirmRemove && (
              <button
                onClick={() => setConfirmRemove(true)}
                className="flex-1 border border-red-100 dark:border-red-600 text-red-500 px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600 hover:text-white transition"
              >
                Ukloni custom domen
              </button>
            )}

            {confirmRemove && (
              <div className="flex-1 rounded-xl border border-red-100 bg-red-50 p-4">
                <p className="text-xs text-red-700 font-semibold mb-3">
                  Sigurno želite da uklonite custom domen? Vaš salon će biti
                  dostupan samo na {platformHost}/{tenant?.slug}.
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
          </div>
        </div>
      </div>

      {/* ── Right column: DNS instructions ──────────────────────────────── */}
      <div className="flex flex-col gap-6">
        {/* DNS records */}
        <div className={card}>
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1">
            DNS podešavanja
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Dodajte jedan od sledećih zapisa kod vašeg registrara domena
            (Vercel, GoDaddy, Namecheap, Cloudflare, itd.).
          </p>

          {/* A record */}
          <div className="mb-4">
            <p className={lbl}>Opcija 1 — A zapis (preporučeno)</p>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-700 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-700">
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
                      <code className="font-bold text-violet-600 dark:text-violet-400">
                        A
                      </code>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <code className="font-mono text-zinc-700 dark:text-zinc-200">
                        @
                      </code>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <code className="font-mono text-zinc-700 dark:text-zinc-200 select-all">
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
            <p className={lbl}>
              Opcija 2 — CNAME zapis (ako registrar podržava)
            </p>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-700 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-700">
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
                      <code className="font-bold text-violet-600 dark:text-violet-400">
                        CNAME
                      </code>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <code className="font-mono text-zinc-700 dark:text-zinc-200">
                        @
                      </code>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <code className="font-mono text-zinc-700 dark:text-zinc-200 select-all">
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
            &quot;Proveri verifikaciju&quot; da potvrdite.
          </p>
        </div>

        {/* TXT verification records from Vercel */}
        {lastVerification?.verification &&
          lastVerification.verification.length > 0 && (
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
                    {lastVerification.verification.map((rec, i) => (
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
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-3">
            Kako funkcioniše
          </h3>
          <ol className="space-y-2.5 text-xs text-zinc-500 list-none">
            {[
              "Pretražite željeni domen gore i proverite dostupnost",
              "Ako je slobodan, kupite ga direktno na Vercel-u (ili kod drugog registrara)",
              'Kliknite "Koristi ovaj domen" ili ga ručno unesite i sačuvajte',
              "Dodajte A ili CNAME zapis kod registrara vašeg domena",
              'Sačekajte do 48h da se DNS promene propagiraju, pa kliknite "Proveri verifikaciju"',
              "Kada je domen verifikovan, vaši klijenti posjećuju salon direktno na vašem domenu",
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

function DomainHealthRow({
  label,
  ok,
  text,
}: {
  label: string;
  ok: boolean;
  text: string;
}) {
  return (
    <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
        {label}
      </p>
      <p
        className={
          ok
            ? "text-xs font-semibold text-emerald-600"
            : "text-xs font-semibold text-amber-600"
        }
      >
        {ok ? "✓" : "⚠"} {text}
      </p>
    </div>
  );
}
