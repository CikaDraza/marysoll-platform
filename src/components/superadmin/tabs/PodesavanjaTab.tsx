"use client";

import { useState } from "react";
import type { useSuperAdminTenants } from "@/hooks/useSuperAdminTenants";
import {
  superAdminCardClass as card,
  superAdminInputClass as inp,
  superAdminLabelClass as lbl,
  superAdminPrimaryButtonClass as btnPrimary,
} from "@/components/superadmin/shared";

interface PodesavanjaTabProps {
  superAdmin: ReturnType<typeof useSuperAdminTenants>;
}

export function PodesavanjaTab({ superAdmin }: PodesavanjaTabProps) {
  const settings = superAdmin.platformSettings as
    | Record<string, unknown>
    | undefined;
  const [form, setForm] = useState({
    defaultTrialDays: String(settings?.defaultTrialDays ?? 30),
    trialMode: String(settings?.trialMode ?? "maria"),
    requireEmailVerification: Boolean(
      settings?.requireEmailVerification ?? true,
    ),
    autoApproveTrials: Boolean(settings?.autoApproveTrials ?? true),
    supportEmail: String(settings?.supportEmail ?? ""),
  });

  function handleSave() {
    superAdmin.savePlatformSettings({
      defaultTrialDays: parseInt(form.defaultTrialDays),
      trialMode: form.trialMode,
      requireEmailVerification: form.requireEmailVerification,
      autoApproveTrials: form.autoApproveTrials,
      supportEmail: form.supportEmail,
    });
  }

  return (
    <div className="space-y-6 max-w-full">
      <h2 className="text-lg font-bold">Podešavanja platforme</h2>

      <div className={card}>
        <h3 className="font-semibold text-sm mb-4 text-violet-400">
          Trial period
        </h3>
        <div className="space-y-4">
          <div>
            <label className={lbl}>Default trajanje triala (dana)</label>
            <input
              type="number"
              className={inp}
              value={form.defaultTrialDays}
              onChange={(e) =>
                setForm((p) => ({ ...p, defaultTrialDays: e.target.value }))
              }
              min={1}
              max={365}
            />
            <p className="text-xs text-slate-500 mt-1">
              Ovaj broj dana dobija svaki novi salon pri registraciji.
            </p>
          </div>

          <div>
            <label className={lbl}>Trial mod</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  value: "maria",
                  label: "🎁 Besplatan trial",
                  desc: "Bez kartice, odmah pristup",
                },
                {
                  value: "card_required",
                  label: "💳 Kartica obavezna",
                  desc: "Naplata, refund opcija",
                },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    form.trialMode === opt.value
                      ? "border-violet-500 bg-violet-900/20"
                      : "border-slate-600 hover:border-slate-500"
                  }`}
                >
                  <input
                    type="radio"
                    name="trialMode"
                    value={opt.value}
                    checked={form.trialMode === opt.value}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, trialMode: e.target.value }))
                    }
                    className="mt-0.5 accent-violet-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {opt.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className={lbl}>
              Auto-odobri trial pri verifikaciji emaila
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                  form.autoApproveTrials ? "bg-violet-600" : "bg-slate-600"
                }`}
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    autoApproveTrials: !p.autoApproveTrials,
                  }))
                }
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                    form.autoApproveTrials ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </div>
              <span className="text-sm text-slate-300">
                {form.autoApproveTrials
                  ? "Da — trial se automatski aktivira"
                  : "Ne — superadmin ručno odobrava"}
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className={card}>
        <h3 className="font-semibold text-sm mb-4 text-violet-400">
          Registracija
        </h3>
        <div className="space-y-4">
          <div>
            <label className={lbl}>Obavezna verifikacija emaila</label>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                  form.requireEmailVerification
                    ? "bg-violet-600"
                    : "bg-slate-600"
                }`}
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    requireEmailVerification: !p.requireEmailVerification,
                  }))
                }
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                    form.requireEmailVerification
                      ? "translate-x-5"
                      : "translate-x-1"
                  }`}
                />
              </div>
              <span className="text-sm text-slate-300">
                {form.requireEmailVerification
                  ? "Da — email mora biti verifikovan"
                  : "Ne"}
              </span>
            </label>
          </div>

          <div>
            <label className={lbl}>Email podrške</label>
            <input
              type="email"
              className={inp}
              value={form.supportEmail}
              onChange={(e) =>
                setForm((p) => ({ ...p, supportEmail: e.target.value }))
              }
              placeholder="podrska@marysoll.com"
            />
          </div>
        </div>
      </div>

      <div className={card}>
        <h3 className="font-semibold text-sm mb-3 text-violet-400">
          Lemon Squeezy integracija
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-300">
            <span>API Key</span>
            <span className="text-slate-500">
              {process.env.NEXT_PUBLIC_LS_CONFIGURED
                ? "✓ Konfigurisano"
                : "ENV: LEMONSQUEEZY_API_KEY"}
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Webhook</span>
            <code className="text-xs text-slate-500">
              /api/webhooks/lemonsqueezy
            </code>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Konfigurišite Lemon Squeezy varijantu ID-jeve u{" "}
          <code>lib/lemonsqueezy.ts → VARIANT_TO_PLAN</code>.
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={superAdmin.isSavingSettings}
        className={btnPrimary + " w-full py-3 text-sm"}
      >
        {superAdmin.isSavingSettings ? "Snimanje..." : "Sačuvaj podešavanja"}
      </button>
    </div>
  );
}
