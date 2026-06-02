import type { ComponentType } from "react";
import {
  UsersIcon,
  ChartBarIcon,
  CreditCardIcon,
  CogIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  TagIcon,
  GlobeAltIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import type { SuperAdminTab, SuperAdminTabConfig } from "@/types/superadmin";

export const superAdminInputClass =
  "w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-400";
export const superAdminLabelClass =
  "block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5";
export const superAdminCardClass =
  "bg-slate-800 rounded-xl border border-slate-700 p-5";
export const superAdminPrimaryButtonClass =
  "px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-500 transition disabled:opacity-40";
export const superAdminDangerButtonClass =
  "px-4 py-2 bg-red-700 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition disabled:opacity-40";
export const superAdminGreenButtonClass =
  "px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition disabled:opacity-40";

export const SUPERADMIN_TABS: SuperAdminTabConfig[] = [
  { id: "saloni", label: "Saloni", icon: UsersIcon as ComponentType<{ className?: string }> },
  { id: "trial", label: "Trial period", icon: ShieldCheckIcon as ComponentType<{ className?: string }> },
  { id: "planovi", label: "Planovi", icon: CreditCardIcon as ComponentType<{ className?: string }> },
  { id: "statistika", label: "Statistika", icon: ChartBarIcon as ComponentType<{ className?: string }> },
  { id: "korisnici", label: "Korisnici", icon: UsersIcon as ComponentType<{ className?: string }> },
  { id: "kategorije", label: "Kategorije", icon: TagIcon as ComponentType<{ className?: string }> },
  { id: "podesavanja", label: "Podešavanja", icon: CogIcon as ComponentType<{ className?: string }> },
  { id: "chat", label: "Chat", icon: ChatBubbleLeftRightIcon as ComponentType<{ className?: string }> },
  { id: "profil", label: "Profil", icon: UserCircleIcon as ComponentType<{ className?: string }> },
  { id: "newsletter", label: "Newsletter", icon: EnvelopeIcon as ComponentType<{ className?: string }> },
  { id: "marketing", label: "Marketing", icon: GlobeAltIcon as ComponentType<{ className?: string }> },
];

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-900/60 text-emerald-400 border-emerald-700",
    suspended: "bg-red-900/60 text-red-400 border-red-700",
    pending: "bg-amber-900/60 text-amber-400 border-amber-700",
    cancelled: "bg-slate-700 text-slate-400 border-slate-600",
  };
  const labels: Record<string, string> = {
    active: "Aktivan",
    suspended: "Suspendovan",
    pending: "Na čekanju",
    cancelled: "Otkazan",
  };

  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
        colors[status] ?? colors.cancelled
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

export function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    maria: "bg-slate-700 text-slate-300",
    claudia: "bg-blue-900/60 text-blue-400",
    kiki: "bg-violet-900/60 text-violet-400",
    enterprise: "bg-amber-900/60 text-amber-400",
  };

  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
        colors[plan] ?? colors.maria
      }`}
    >
      {plan}
    </span>
  );
}

export function isSuperAdminTab(value: string): value is SuperAdminTab {
  return SUPERADMIN_TABS.some((tab) => tab.id === value);
}
