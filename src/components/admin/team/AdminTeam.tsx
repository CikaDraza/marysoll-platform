"use client";

import { FormEvent, useCallback, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  useCreateTeamInvitation,
  useResendTeamInvitation,
  useTeamOverview,
} from "@/hooks/useTeam";
import type {
  TeamInvitationResponse,
  TeamMemberStatus,
  TeamMemberView,
  TeamOverview,
} from "@/types/team";

const PLAN_LABELS: Record<TeamOverview["plan"], string> = {
  maria: "Maria",
  claudia: "Claudia",
  kiki: "Kiki",
  enterprise: "Enterprise",
};

const STATUS_LABELS: Record<TeamMemberStatus, string> = {
  active: "Aktivan nalog",
  invited: "Čeka prihvatanje",
  suspended: "Suspendovan",
};

const STATUS_STYLES: Record<TeamMemberStatus, string> = {
  active:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300",
  invited:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300",
  suspended:
    "border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const dateFormatter = new Intl.DateTimeFormat("sr-Latn-RS", {
  dateStyle: "medium",
  timeStyle: "short",
});

function apiErrorMessage(error: unknown, fallback: string): string {
  return (
    (error as { response?: { data?: { error?: string } } })?.response?.data
      ?.error ?? fallback
  );
}

function TeamLoadingSkeleton() {
  return (
    <div className="space-y-6" aria-label="Učitavanje tima">
      <div className="h-36 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
      <div className="h-56 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
      <div className="h-72 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
    </div>
  );
}

function SeatUsageCard({ overview }: { overview: TeamOverview }) {
  const { seats, plan } = overview;
  const percentage = seats.unlimited
    ? 0
    : Math.min(100, Math.round((seats.used / Math.max(seats.limit, 1)) * 100));

  return (
    <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm dark:border-violet-900 dark:from-violet-950/40 dark:to-gray-900 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-300">
            {PLAN_LABELS[plan]} plan
          </p>
          <h2 className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
            Mesta za članove tima
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
            OWNER ne zauzima mesto. Aktivni i pozvani ADMIN/STAFF članovi ga
            zauzimaju odmah.
          </p>
        </div>
        <div className="shrink-0 rounded-2xl bg-white px-5 py-3 text-center shadow-sm ring-1 ring-violet-100 dark:bg-gray-900 dark:ring-violet-900">
          <p className="text-2xl font-black tabular-nums text-violet-700 dark:text-violet-300">
            {seats.used} / {seats.unlimited ? "∞" : seats.limit}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">iskorišćeno</p>
        </div>
      </div>

      {!seats.unlimited ? (
        <div className="mt-5">
          <div
            className="h-2 overflow-hidden rounded-full bg-violet-100 dark:bg-gray-800"
            role="progressbar"
            aria-label="Iskorišćena mesta u timu"
            aria-valuemin={0}
            aria-valuemax={seats.limit}
            aria-valuenow={seats.used}
          >
            <div
              className="h-full rounded-full bg-violet-600 transition-[width]"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>
              {seats.remaining === 0
                ? "Sva mesta su zauzeta"
                : `Preostalo mesta: ${seats.remaining}`}
            </span>
            {!seats.canAdd ? (
              <Link
                href="/dashboard?tab=pretplata#planovi"
                className="font-semibold text-violet-700 hover:underline dark:text-violet-300"
              >
                Pogledaj veći plan
              </Link>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-5 text-sm font-medium text-violet-700 dark:text-violet-300">
          Broj članova tima nije ograničen.
        </p>
      )}
    </section>
  );
}

function InviteLinkPanel({ invitation }: { invitation: TeamInvitationResponse }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(invitation.inviteUrl);
      setCopied(true);
      toast.success("Link je kopiran");
    } catch {
      toast.error("Kopiranje nije uspelo. Označite link i kopirajte ga ručno.");
    }
  }

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-900/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-bold text-emerald-900 dark:text-emerald-200">
            Novi poziv je spreman
          </h2>
          <p className="mt-1 text-sm leading-6 text-emerald-800 dark:text-emerald-300">
            {invitation.emailSent
              ? `Email je poslat na ${invitation.member.email}.`
              : "Email nije mogao biti poslat. Kopirajte link i pošaljite ga direktno članu."}
            {" "}Link važi do {dateFormatter.format(new Date(invitation.expiresAt))}.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-gray-900 dark:text-emerald-300">
          {invitation.member.name}
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={invitation.inviteUrl}
          readOnly
          aria-label="Link za aktivaciju člana tima"
          onFocus={(event) => event.currentTarget.select()}
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-emerald-400/40 dark:border-emerald-800 dark:bg-gray-950 dark:text-gray-200"
        />
        <button
          type="button"
          onClick={copyLink}
          className="min-h-12 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          {copied ? "Kopirano" : "Kopiraj link"}
        </button>
      </div>
      <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
        Zbog bezbednosti ovaj link se prikazuje samo sada. Novi link rotira i
        poništava prethodni.
      </p>
    </section>
  );
}

function InviteMemberForm({
  canAdd,
  onCreated,
}: {
  canAdd: boolean;
  onCreated: (invitation: TeamInvitationResponse) => void;
}) {
  const createInvitation = useCreateTeamInvitation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const invitation = await createInvitation.mutateAsync({ name, email });
      setName("");
      setEmail("");
      onCreated(invitation);
      toast.success("Član je pozvan kao STAFF");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Poziv nije mogao biti kreiran."));
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Pozovi člana tima
        </h2>
        <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
          Novi član se uvek poziva kao STAFF. Administratorska prava se ne
          određuju redosledom pozivanja.
        </p>
      </div>
      <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
          Ime i prezime
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            autoComplete="name"
            disabled={!canAdd || createInvitation.isPending}
            className="mt-2 min-h-12 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-normal text-gray-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-violet-900"
          />
        </label>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            disabled={!canAdd || createInvitation.isPending}
            className="mt-2 min-h-12 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-normal text-gray-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-violet-900"
          />
        </label>
        <button
          type="submit"
          disabled={!canAdd || createInvitation.isPending}
          className="min-h-12 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {createInvitation.isPending ? "Slanje…" : "Pošalji poziv"}
        </button>
      </form>
      {!canAdd ? (
        <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">
          Limit plana je dostignut. Oslobodite mesto ili izaberite veći plan pre
          novog poziva.
        </p>
      ) : null}
    </section>
  );
}

function TeamMemberRow({
  member,
  isResending,
  onResend,
}: {
  member: TeamMemberView;
  isResending: boolean;
  onResend: (member: TeamMemberView) => void;
}) {
  const roleLabel =
    member.role === "OWNER"
      ? "Vlasnik"
      : member.role === "ADMIN"
        ? "Administrator"
        : "Član tima";
  return (
    <li className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-black text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
          {member.name.trim().charAt(0).toUpperCase() || "?"}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-gray-900 dark:text-white">{member.name}</p>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {roleLabel}
            </span>
          </div>
          <p className="mt-1 break-all text-sm text-gray-500 dark:text-gray-400">
            {member.email}
          </p>
          {member.status === "invited" && member.invitedAt ? (
            <p className="mt-1 text-xs text-gray-400">
              Pozvan/a {dateFormatter.format(new Date(member.invitedAt))}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[member.status]}`}
        >
          {STATUS_LABELS[member.status]}
        </span>
        {member.role === "STAFF" && member.status === "invited" ? (
          <button
            type="button"
            onClick={() => onResend(member)}
            disabled={isResending}
            className="min-h-11 rounded-xl border border-violet-200 px-4 py-2 text-sm font-bold text-violet-700 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/40"
          >
            {isResending ? "Generisanje…" : "Novi link i email"}
          </button>
        ) : null}
      </div>
    </li>
  );
}

function TeamMembersList({
  members,
  resendingId,
  onResend,
}: {
  members: TeamMemberView[];
  resendingId: string | null;
  onResend: (member: TeamMemberView) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-gray-100 px-5 py-5 dark:border-gray-800 sm:px-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Članovi tima
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Vlasnik i sva postojeća STAFF/ADMIN članstva ovog salona.
        </p>
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {members.map((member) => (
          <TeamMemberRow
            key={member.id}
            member={member}
            isResending={resendingId === member.id}
            onResend={onResend}
          />
        ))}
      </ul>
    </section>
  );
}

export default function AdminTeam() {
  const { user } = useAuth();
  const isOwner = user?.globalRole === "OWNER";
  const team = useTeamOverview(isOwner);
  const resend = useResendTeamInvitation();
  const [latestInvitation, setLatestInvitation] =
    useState<TeamInvitationResponse | null>(null);

  const handleCreated = useCallback((invitation: TeamInvitationResponse) => {
    setLatestInvitation(invitation);
  }, []);

  async function handleResend(member: TeamMemberView) {
    try {
      const invitation = await resend.mutateAsync(member.id);
      setLatestInvitation(invitation);
      toast.success(`Novi poziv za ${member.name} je generisan`);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Novi poziv nije mogao biti generisan."));
    }
  }

  if (!isOwner) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
        Samo vlasnik salona može upravljati članovima tima.
      </div>
    );
  }

  if (team.isLoading) return <TeamLoadingSkeleton />;
  if (team.isError || !team.data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">
        <p className="text-sm text-red-700 dark:text-red-300">
          Tim trenutno nije moguće učitati.
        </p>
        <button
          type="button"
          onClick={() => team.refetch()}
          className="mt-4 min-h-11 rounded-xl border border-red-300 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300"
        >
          Pokušaj ponovo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
          Team
        </p>
        <h1 className="mt-1 text-2xl font-black text-gray-900 dark:text-white">
          Članovi salona
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-400">
          Pozovite osobu kao STAFF člana. Poziv zauzima mesto odmah, a član
          sam postavlja lozinku preko bezbednog activation linka.
        </p>
      </header>
      <SeatUsageCard overview={team.data} />
      {latestInvitation ? (
        <InviteLinkPanel
          key={latestInvitation.inviteUrl}
          invitation={latestInvitation}
        />
      ) : null}
      <InviteMemberForm
        canAdd={team.data.seats.canAdd}
        onCreated={handleCreated}
      />
      <TeamMembersList
        members={team.data.members}
        resendingId={resend.isPending ? (resend.variables ?? null) : null}
        onResend={handleResend}
      />
    </div>
  );
}
