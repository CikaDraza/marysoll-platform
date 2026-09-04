import { useRouter } from "next/navigation";
import ClientModalActionButtons from "../ClientModalActionButtons";
import { formatISODate } from "@/helpers/formatISODate";
import { displayClientContact, isPlaceholderGuestEmail, normalizeInstagram } from "@/lib/contactRules";
import type { ClientDuplicateInfo } from "@/hooks/useClientDirectory";
import type { IUser } from "@/types";

function ClientContact({ user }: { user: IUser }) {
  const instagram = normalizeInstagram(user.instagram);
  return <><p className="mt-1 truncate text-xs/5 text-gray-500">{displayClientContact({ email: user.email, instagram: user.instagram, phone: user.phone })}</p>{instagram && !isPlaceholderGuestEmail(user.email) && <p className="mt-0.5 truncate text-xs/5 text-gray-500">@{instagram}</p>}</>;
}

function DuplicateBadge({ duplicate }: { duplicate?: ClientDuplicateInfo }) {
  if (!duplicate) return null;
  return <span className="inline-block rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">Mogući duplikat</span>;
}

function DuplicateAction({ userId, duplicate, onMerge }: { userId: string; duplicate?: ClientDuplicateInfo; onMerge: (sourceId: string, targetId: string) => void }) {
  if (!duplicate || duplicate.isKeeper) return null;
  return <button onClick={() => onMerge(userId, duplicate.targetId)} className="text-xs font-bold text-violet-600 hover:text-violet-800">Spoji sa {duplicate.targetName} →</button>;
}

function Presence({ online }: { online?: boolean }) {
  if (online) return <div className="mt-1 flex items-center gap-x-1.5"><div className="flex-none rounded-full p-1 animate-pulse bg-emerald-500/20"><div className="size-1.5 rounded-full bg-emerald-500" /></div><p className="text-xs/5 text-gray-500">Online</p></div>;
  return <div className="mt-1 flex items-center gap-x-1.5"><div className="flex-none rounded-full p-1 bg-red-500/20"><div className="size-1.5 rounded-full bg-red-500" /></div><p className="text-xs/5 text-gray-500">Offline</p></div>;
}

function ActivityDates({ user }: { user: IUser }) {
  return <>{user.lastActive && <p className="mt-1 text-xs/5 text-gray-500">Zadnji put aktivan: <time dateTime={user.lastActive.toString()}>{formatISODate(user.lastActive.toString())}</time></p>}<p className="text-xs/5 text-gray-500"><time dateTime={user.createdAt ?? new Date().toISOString()}>Kreiran: {formatISODate(user.createdAt ?? "")}</time></p></>;
}

export function ClientDirectoryRow({ user, duplicate, onMerge }: { user: IUser; duplicate?: ClientDuplicateInfo; onMerge: (sourceId: string, targetId: string) => void }) {
  const router = useRouter();
  return <li className="flex justify-between gap-x-6 py-5"><div className="flex flex-col min-w-0 gap-x-4"><div className="min-w-0 flex-auto"><p className="text-sm/6 font-semibold text-gray-900 dark:text-gray-300 flex items-center gap-2 flex-wrap"><button className="text-left hover:text-violet-600 hover:underline" onClick={() => router.push(`/dashboard?tab=klijenti&clientId=${user._id}`)}>{user.name}</button><DuplicateBadge duplicate={duplicate} /></p><ClientContact user={user} /></div><div className="flex items-center gap-3 flex-wrap"><ClientModalActionButtons userIsSet={user} /><DuplicateAction userId={user._id} duplicate={duplicate} onMerge={onMerge} /></div></div><div className="hidden shrink-0 sm:flex sm:flex-col sm:items-end"><div className="mt-1 flex flex-col items-end gap-x-1.5"><Presence online={user.isOnline} /><ActivityDates user={user} /></div></div></li>;
}
