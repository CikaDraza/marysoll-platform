"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useClientOverview } from "@/hooks/useClientOverview";
import { StatisticsMetricCard } from "./statistics/StatisticsMetricCard";
import { AdjustModal } from "./loyalty/LoyaltyClients";
import type { LoyaltyAdminAccount } from "@/hooks/useLoyaltyAdmin";

function Section({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <summary className="cursor-pointer select-none px-5 py-4 font-bold text-gray-900 dark:text-gray-100">{title}</summary>
      <div className="border-t border-gray-100 dark:border-gray-800 p-5">{children}</div>
    </details>
  );
}

const money = (value: number | null | undefined) => value == null
  ? "Cena nije definisana"
  : new Intl.NumberFormat("sr-RS", { style: "currency", currency: "RSD" }).format(value);

export default function Client360({ clientId, onBack }: { clientId: string; onBack: () => void }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [adjustOpen, setAdjustOpen] = useState(false);
  const { data, isLoading, isError } = useClientOverview(clientId, month, year);

  if (isLoading) return <p className="py-10 text-center text-sm text-gray-500">Učitavanje Client 360 dosijea…</p>;
  if (isError || !data) return <p className="py-10 text-center text-sm text-red-600">Client 360 nije moguće učitati.</p>;
  const c = data.client;
  const i = data.insights as Record<string, unknown>;

  const metrics = [
    ["Potencijal", money(i.potential as number)], ["Realizovano", money(i.realized as number)],
    ["Ukupno termina", i.total], ["Završeni", i.completed], ["Otkazani", i.cancelled],
    ["Nije došla/o", i.noShow], ["Preporuke", i.testimonialCount],
    ["Poslednja poseta", (i.lastVisit as { date?: string } | null)?.date ?? "—"],
    ["Sledeći termin", (i.nextAppointment as { date?: string } | null)?.date ?? "—"],
  ];

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm font-bold text-violet-600 hover:underline">← Svi klijenti</button>
      <header className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5">
        <h2 className="text-2xl font-black text-gray-900 dark:text-white">{c.name}</h2>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500">
          <span>{c.email}</span>{c.phone && <span>{c.phone}</span>}{c.instagram && <span>@{c.instagram}</span>}{c.tiktok && <span>TikTok: @{c.tiktok}</span>}
        </div>
        <p className="mt-2 text-xs text-gray-400">Klijent od {new Date(c.createdAt).toLocaleDateString("sr-RS")}</p>
      </header>

      <Section title={`Termini (${data.appointments.length})`} open>
        {!data.appointments.length ? <p className="text-sm text-gray-500">Nema termina.</p> : (
          <div className="space-y-3">{data.appointments.map((a) => (
            <article key={a._id} className="rounded-xl border border-gray-100 dark:border-gray-800 p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2"><strong>{a.serviceName}</strong><span>{a.date} · {a.time} · {a.status}</span></div>
              <p className="mt-1 text-gray-500">{a.status === "completed" ? money(a.realizedValue) : money(a.potentialValue)}</p>
              {a.request?.note && <p className="mt-2 rounded-lg bg-gray-50 dark:bg-gray-950 p-2">Zahtev: {a.request.note}</p>}
              {a.request?.referenceUrl && <a className="text-violet-600 hover:underline" href={a.request.referenceUrl} target="_blank" rel="noreferrer">Referenca klijenta</a>}
              {!!a.request?.attachments?.length && <div className="mt-2 flex flex-wrap gap-2">{a.request.attachments.map((attachment, index) => <a key={`${attachment.url}-${index}`} href={attachment.url} target="_blank" rel="noreferrer"><Image src={attachment.url} alt="Prilog uz zahtev" width={64} height={64} className="h-16 w-16 rounded-lg object-cover" /></a>)}</div>}
            </article>
          ))}</div>
        )}
      </Section>

      <Section title="Statistika i CRM uvidi">
        <div className="mb-4 flex gap-2">
          <input aria-label="Mesec" type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-24 rounded-lg border p-2 dark:bg-gray-950" />
          <input aria-label="Godina" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28 rounded-lg border p-2 dark:bg-gray-950" />
        </div>
        {!data.insights.available ? (
          <p className="rounded-xl bg-violet-50 dark:bg-violet-950/30 p-4 text-sm text-violet-700 dark:text-violet-300">Napredni Client 360 uvidi dostupni su na Kiki planu.</p>
        ) : <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{metrics.map(([label, value]) => (
            <StatisticsMetricCard key={String(label)}><p className="text-xs text-gray-500">{String(label)}</p><p className="mt-1 text-lg font-black">{String(value ?? "—")}</p></StatisticsMetricCard>
          ))}</div>
          {Number(i.withoutPrice) > 0 && <p className="mt-3 text-xs text-amber-600">{String(i.withoutPrice)} termina nema definisanu cenu i ne ulazi u novčane zbirove.</p>}
          {i.topThree === true && <p className="mt-2 text-sm font-bold text-emerald-600">Klijent je u Top 3 za izabrani period.</p>}
          {Array.isArray(i.topClients) && i.topClients.length > 0 && <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="text-gray-500"><th className="py-2">Top 3 klijenta</th><th className="py-2 text-right">Termini</th></tr></thead><tbody>{(i.topClients as Array<{ clientId: string | null; name: string; count: number }>).map((entry) => <tr key={entry.clientId ?? entry.name} className="border-t border-gray-100 dark:border-gray-800"><td className="py-2">{entry.name}</td><td className="py-2 text-right font-bold">{entry.count}</td></tr>)}</tbody></table></div>}
        </>}
      </Section>

      {data.loyalty.enabled && <Section title="Loyalty">
        {!data.loyalty.account ? <p className="text-sm text-gray-500">Klijent još nema loyalty nalog.</p> : <>
          <div className="flex gap-5 text-sm"><strong>{String(data.loyalty.account.heartsBalance ?? 0)} ❤️</strong><strong>{String(data.loyalty.account.pointsBalance ?? 0)} ⭐</strong></div>
          <p className="mt-2 text-xs text-gray-500">Ledger: {data.loyalty.ledger?.length ?? 0} stavki · Vaučeri: {data.loyalty.vouchers?.length ?? 0}</p>
          <button onClick={() => setAdjustOpen(true)} className="mt-3 mr-4 text-sm font-bold text-violet-600 hover:underline">Koriguj balans</button>
          <Link href="/dashboard?tab=growth" className="mt-3 inline-block text-sm font-bold text-violet-600 hover:underline">Otvori Growth Studio za korekcije i vaučere →</Link>
        </>}
      </Section>}

      <Section title={`Preporuke (${data.testimonials.length})`}>
        {!data.testimonials.length ? <p className="text-sm text-gray-500">Nema preporuka.</p> : <div className="space-y-3">{data.testimonials.map((t) => <article key={t._id} className="rounded-xl border p-3 text-sm"><strong>{"★".repeat(t.rating)}</strong><p>{t.comment}</p>{t.adminReply && <p className="mt-1 text-gray-500">Odgovor: {t.adminReply}</p>}</article>)}</div>}
        <Link href="/dashboard?tab=preporuke" className="mt-3 inline-block text-sm font-bold text-violet-600 hover:underline">Upravljaj preporukama →</Link>
      </Section>
      {adjustOpen && data.loyalty.account && <AdjustModal account={{ ...(data.loyalty.account as unknown as LoyaltyAdminAccount), client: { _id: c._id, name: c.name, email: c.email } }} onClose={() => setAdjustOpen(false)} />}
    </div>
  );
}
