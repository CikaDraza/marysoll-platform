"use client";

import { useState, type FormEvent } from "react";
import type { IService } from "@/types";
import type { Theme8VoucherRequestInput, Theme8VoucherRequestResult, Theme8VoucherServiceOption } from "@/types/theme8-voucher";
import { formatVoucherPrice, voucherDmMessage } from "@/helpers/theme8Voucher";
import { voucherRequestErrorSchema, voucherRequestInputSchema, voucherRequestResultSchema } from "@/lib/theme8/voucher-validation";

const inputClass = "mt-1.5 block w-full rounded-[14px] border-[3px] border-y2k-ink bg-white px-3.5 py-3 text-[15px] text-y2k-ink outline-none placeholder:text-[#c9b3c0] focus:shadow-[3px_3px_0_#8B16C9]";
const labelClass = "block font-extrabold text-[11px] uppercase tracking-[0.12em] text-[#9a7d8b]";
const buttonClass = "w-full rounded-full border-[4px] border-y2k-ink bg-y2k-pink px-6 py-3.5 text-center font-black uppercase text-white shadow-[4px_4px_0_#0b0b0f] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60";

function voucherOptions(services: IService[]): Theme8VoucherServiceOption[] {
  return services
    .filter((service) => service._id && service.name?.trim() &&
      service.basePrice != null && service.basePrice > 0 && service.priceMode !== "on_request" && service.priceMode !== "from")
    .map((service) => ({ id: String(service._id), name: service.name, price: Number(service.basePrice) }));
}

export function Theme8VoucherRequestModal({ tenantSlug, services }: { tenantSlug?: string; services: IService[] }) {
  const options = voucherOptions(services);
  const [form, setForm] = useState<Theme8VoucherRequestInput>({
    purchaserName: "", purchaserInstagram: "", recipientName: "", serviceId: "",
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Theme8VoucherRequestResult | null>(null);
  const [copied, setCopied] = useState(false);

  function setField(field: keyof Theme8VoucherRequestInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = voucherRequestInputSchema.safeParse(form);
    if (!parsed.success || !tenantSlug) {
      setError("Proverite ime, Instagram profil i izabranu tehniku.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/public/${encodeURIComponent(tenantSlug)}/voucher-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const parsedError = voucherRequestErrorSchema.safeParse(body);
        setError(parsedError.success ? parsedError.data.error : "Zahtev trenutno nije moguće poslati.");
        return;
      }
      const valid = voucherRequestResultSchema.safeParse(body);
      if (!valid.success) throw new Error("Invalid voucher response");
      setResult(valid.data);
    } catch {
      setError("Veza je prekinuta. Proverite internet i pokušajte ponovo.");
    } finally {
      setSending(false);
    }
  }

  async function copyDmMessage() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(voucherDmMessage({
        greetingName: result.greetingName,
        purchaserName: form.purchaserName.trim(),
        recipientName: form.recipientName.trim(),
        serviceName: result.serviceName,
        requestCode: result.requestCode,
      }));
      setCopied(true);
    } catch {
      setError("Kopiranje nije uspelo. Prepišite broj zahteva u DM.");
    }
  }

  return (
    <div className="rounded-[28px] border-[4px] border-y2k-ink bg-white p-6 text-y2k-ink shadow-[10px_12px_0_#ff2e97] sm:p-8">
      <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-y2k-purple">The Lash Room ♡</div>
      <h2 className="mt-2 font-bagel text-[32px] leading-tight sm:text-[38px]">🎁 Poklon vaučer</h2>
      {result ? (
        <div className="mt-5 space-y-4">
          <p className="font-medium">Zahtev je sačuvan. Broj zahteva: <strong>{result.requestCode}</strong></p>
          <p className="text-sm font-medium">Tehnika: {result.serviceName}</p>
          {!result.notificationSent && <p className="rounded-xl bg-y2k-baby-pink p-3 text-sm font-semibold">Email obaveštenje nije poslato. Pošaljite podatke i u Instagram DM.</p>}
          <p className="text-sm font-medium">Kopirajte poruku, pa otvorite Instagram DM i nalepite je u razgovor.</p>
          <button type="button" onClick={copyDmMessage} className={buttonClass}>
            {copied ? "Kopirano ✓" : "Kopiraj podatke i nalepi u DM"}
          </button>
          <a href={result.dmUrl} target="_blank" rel="noopener noreferrer" className="block w-full rounded-full border-[3px] border-y2k-ink bg-y2k-ink px-6 py-3 text-center font-extrabold text-white hover:bg-y2k-purple">
            Otvori Instagram DM ↗
          </a>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className={labelClass}>Od koga
            <input autoFocus autoComplete="name" required maxLength={80} value={form.purchaserName} onChange={(event) => setField("purchaserName", event.target.value)} className={inputClass} placeholder="Vaše ime" />
          </label>
          <label className={labelClass}>Moj Instagram
            <input autoCapitalize="none" spellCheck={false} required maxLength={31} value={form.purchaserInstagram} onChange={(event) => setField("purchaserInstagram", event.target.value)} className={inputClass} placeholder="@username" />
          </label>
          <label className={labelClass}>Za
            <input autoComplete="off" required maxLength={80} value={form.recipientName} onChange={(event) => setField("recipientName", event.target.value)} className={inputClass} placeholder="Ime osobe kojoj poklanjate" />
          </label>
          <fieldset>
            <legend className={labelClass}>Izaberi tehniku</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {options.map((option) => (
                <label key={option.id} className={`cursor-pointer rounded-xl border-[3px] p-2.5 text-sm font-bold ${form.serviceId === option.id ? "border-y2k-pink bg-y2k-baby-pink shadow-[3px_3px_0_#0b0b0f]" : "border-y2k-ink bg-white"}`}>
                  <input type="radio" name="serviceId" value={option.id} checked={form.serviceId === option.id} onChange={() => setField("serviceId", option.id)} className="sr-only" required />
                  <span className="block">{option.name}</span>
                  <span className="block text-xs font-medium">{formatVoucherPrice(option.price)}</span>
                </label>
              ))}
            </div>
            {options.length === 0 && <p className="mt-2 text-sm">Trenutno nema tehnika dostupnih za vaučer.</p>}
          </fieldset>
          <p className="text-xs font-medium text-[#7a5a6c]">Plaćanje i preuzimanje lično u salonu. Vaučer nema vremensko ograničenje.</p>
          <button type="submit" disabled={sending || options.length === 0 || !tenantSlug} className={buttonClass}>
            {sending ? "Šaljemo zahtev…" : "Pošalji zahtev"}
          </button>
        </form>
      )}
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
