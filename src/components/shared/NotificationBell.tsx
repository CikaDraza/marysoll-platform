/**
 * NotificationBell — dropdown notifikacija za admin i klijentski panel.
 *
 * Koristi postojeće:
 *   - useNotifications / useNotificationMutations hookove
 *   - /api/notifications, /api/notifications/update, /api/notifications/delete API rute
 *
 * Razlike od single-tenant verzije:
 *   - Navigacija koristi tenantSlug prop (ili /dashboard za admina)
 *   - Delete je skoped na tenantId (server strana) + samo za admina
 *   - Stilovi prate admin/client panel design system (zinc/violet)
 */
"use client";

import { useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { BellIcon } from "@heroicons/react/24/outline";
import { formatDistanceToNow } from "date-fns";
import { sr } from "date-fns/locale";
import toast from "react-hot-toast";
import {
  useNotifications,
  useNotificationMutations,
} from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import type { INotification } from "@/types";
import Link from "next/link";

interface NotificationBellProps {
  /**
   * base — routing prefix from useClientRouting().
   * "" on subdomain/custom domain → links become /panel?tab=...
   * "/{slug}" on localhost dev → links become /{slug}/panel?tab=...
   * undefined (admin panel) → links use /dashboard?tab=...
   */
  base?: string;
}

// ─── Helper: navigaciona ruta po tipu notifikacije ────────────────────────────

function getNotificationHref(
  notification: INotification,
  isAdmin: boolean,
  base?: string,
): string {
  const panelBase = base !== undefined ? `${base}/panel` : "/dashboard";

  if (notification.type === "chat_message") {
    return `${panelBase}?tab=chat`;
  }

  // Podsetnik da termin nije označen (Growth Studio) — vodi pravo na taj termin.
  if (notification.type === "loyalty_completion_prompt") {
    const href = `${panelBase}?tab=termini`;
    return notification.appointmentId
      ? `${href}&appointmentId=${notification.appointmentId}`
      : href;
  }

  if (notification.type.includes("appointment")) {
    const tab = isAdmin ? "termini" : "Moji Termini";
    const href = `${panelBase}?tab=${encodeURIComponent(tab)}`;
    // Admin lista ume da skoči na konkretan termin (paging + skrol + highlight).
    return isAdmin && notification.appointmentId
      ? `${href}&appointmentId=${notification.appointmentId}`
      : href;
  }

  if (notification.type.includes("testimonial")) {
    const tab = isAdmin ? "preporuke" : "Moje Preporuke";
    return `${panelBase}?tab=${encodeURIComponent(tab)}`;
  }

  return panelBase;
}

// ─── Helper: ikona po tipu ────────────────────────────────────────────────────

function getIcon(type: INotification["type"]): string {
  if (type === "chat_message") return "💬";
  if (type.includes("appointment")) return "📅";
  if (type.includes("testimonial")) return "⭐";
  return "🔔";
}

// ─── NotificationItem ─────────────────────────────────────────────────────────

function NotificationItem({
  notification,
  onRead,
  isAdmin,
  base,
}: {
  notification: INotification;
  onRead: (id: string) => void;
  isAdmin: boolean;
  base?: string;
}) {
  const href = getNotificationHref(notification, isAdmin, base);

  return (
    <MenuItem>
      <Link
        href={href}
        onClick={() => onRead(notification._id)}
        className={`flex items-start gap-3 px-4 py-3 text-sm hover:bg-zinc-50 transition border-b border-zinc-100 last:border-0 ${
          notification.isRead ? "opacity-60" : ""
        }`}
      >
        {/* Unread dot */}
        <div className="relative mt-0.5 flex-shrink-0">
          <span className="text-base">{getIcon(notification.type)}</span>
          {!notification.isRead && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-violet-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={`text-xs font-semibold leading-snug text-zinc-800 ${!notification.isRead ? "font-bold" : ""}`}
            >
              {notification.title}
            </p>
            <span className="text-[10px] text-zinc-400 whitespace-nowrap flex-shrink-0">
              {formatDistanceToNow(new Date(notification.createdAt), {
                addSuffix: true,
                locale: sr,
              })}
            </span>
          </div>

          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">
            {notification.message}
          </p>

          {notification.metadata?.serviceName && (
            <p className="text-[10px] text-violet-500 mt-1 font-medium">
              {notification.metadata.serviceName}
            </p>
          )}

          {notification.metadata?.rating && (
            <p className="text-[10px] text-amber-500 mt-1">
              {"★".repeat(notification.metadata.rating)}
              {"☆".repeat(5 - notification.metadata.rating)}
              <span className="text-zinc-400 ml-1">
                {notification.metadata.rating}/5
              </span>
            </p>
          )}
        </div>
      </Link>
    </MenuItem>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NotificationBell({ base }: NotificationBellProps) {
  const [deleteMode, setDeleteMode] = useState<"all" | "old">("old");
  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;

  const { data: notifications = [] } = useNotifications(true);
  const { markAsRead, markAllAsRead, deleteNotifications } =
    useNotificationMutations();

  const { isSupported, permission, subscription, subscribeToPush } =
    usePushNotifications();
  const [pushBusy, setPushBusy] = useState(false);
  const pushEnabled = permission === "granted" && !!subscription;

  async function handleEnablePush() {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      if (!isSupported) {
        toast.error("Browser ne podržava push notifikacije.");
        return;
      }
      const ok = await subscribeToPush();
      if (ok) toast.success("Push notifikacije uključene");
      else toast.error("Dozvola za notifikacije nije odobrena.");
    } finally {
      setPushBusy(false);
    }
  }

  // Group by type
  const appointmentNotifs = notifications.filter((n) =>
    n.type.includes("appointment"),
  );
  const testimonialNotifs = notifications.filter((n) =>
    n.type.includes("testimonial"),
  );
  const otherNotifs = notifications.filter(
    (n) => !n.type.includes("appointment") && !n.type.includes("testimonial"),
  );

  const unreadCount = notifications.length;

  function handleRead(id: string) {
    markAsRead.mutate([id]);
  }

  function handleMarkAllRead() {
    if (notifications.length === 0) return;
    markAllAsRead.mutate(undefined, {
      onSuccess: () => toast.success("Sve notifikacije označene kao pročitane"),
      onError: () => toast.error("Greška pri označavanju notifikacija"),
    });
  }

  function handleDelete() {
    const label =
      deleteMode === "all"
        ? "sve notifikacije"
        : "notifikacije starije od mesec dana";

    if (!confirm(`Obrisati ${label}?`)) return;

    deleteNotifications.mutate(deleteMode, {
      onSuccess: (data: { deletedCount: number }) => {
        toast.success(`Obrisano ${data.deletedCount} obaveštenja`);
      },
      onError: () => {
        toast.error("Greška pri brisanju notifikacija");
      },
    });
  }

  return (
    <Menu as="div" className="relative p-2">
      {/* Bell button */}
      <MenuButton className="cursor-pointer relative flex items-center justify-center w-10 h-10 text-gray-500 bg-white border border-gray-200 rounded-full transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white">
        <BellIcon className="w-5 h-5" />

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] w-[18px] h-[18px] p-2 flex items-center justify-center text-[10px] font-bold text-white bg-violet-600 rounded-full border-2 border-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </MenuButton>

      {/* Dropdown — na mobilnom fixed preko cele širine ispod headera (h-16 +
          8px razmaka = top-[72px]): u admin headeru zvono nije uz desnu ivicu
          pa bi dropdown sidren uz dugme izlazio van ekrana (isti šablon kao
          SuperAdminNotificationBell); na lg+ ostaje uz desnu ivicu dugmeta. */}
      <MenuItems className="fixed inset-x-3 top-[72px] z-50 origin-top rounded-2xl bg-white shadow-xl ring-1 ring-zinc-200 focus:outline-none overflow-hidden lg:absolute lg:inset-x-auto lg:right-0 lg:top-auto lg:mt-2 lg:w-96 lg:origin-top-right">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-zinc-800">Obaveštenja</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">
                {unreadCount} novo
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-violet-600 hover:text-violet-800 font-medium transition"
            >
              Označi sve pročitanim
            </button>
          )}
        </div>

        {/* Enable push (po uređaju) */}
        {isSupported && !pushEnabled && (
          <button
            onClick={handleEnablePush}
            disabled={pushBusy}
            className="w-full text-left px-4 py-2.5 text-xs font-medium text-violet-600 hover:bg-zinc-50 border-b border-zinc-100 transition disabled:opacity-50"
          >
            🔔{" "}
            {pushBusy
              ? "Uključivanje..."
              : permission === "denied"
                ? "Push je blokiran u browseru — omogućite u podešavanjima sajta"
                : "Uključi push notifikacije na ovom uređaju"}
          </button>
        )}

        {/* Notification list */}
        <div className="max-h-[420px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <BellIcon className="w-8 h-8 text-zinc-300 mb-2" />
              <p className="text-sm text-zinc-400">Nema novih obaveštenja</p>
            </div>
          ) : (
            <>
              {appointmentNotifs.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 bg-zinc-50 border-b border-zinc-100">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      Termini · {appointmentNotifs.length}
                    </span>
                  </div>
                  {appointmentNotifs.map((n) => (
                    <NotificationItem
                      key={n._id}
                      notification={n}
                      onRead={handleRead}
                      isAdmin={isAdmin}
                      base={base}
                    />
                  ))}
                </div>
              )}

              {testimonialNotifs.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 bg-zinc-50 border-b border-zinc-100">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      Preporuke · {testimonialNotifs.length}
                    </span>
                  </div>
                  {testimonialNotifs.map((n) => (
                    <NotificationItem
                      key={n._id}
                      notification={n}
                      onRead={handleRead}
                      isAdmin={isAdmin}
                      base={base}
                    />
                  ))}
                </div>
              )}

              {otherNotifs.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 bg-zinc-50 border-b border-zinc-100">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      Ostalo · {otherNotifs.length}
                    </span>
                  </div>
                  {otherNotifs.map((n) => (
                    <NotificationItem
                      key={n._id}
                      notification={n}
                      onRead={handleRead}
                      isAdmin={isAdmin}
                      base={base}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Admin footer — delete controls */}
        {isAdmin && (
          <div className="flex items-center gap-2 px-4 py-3 border-t border-zinc-100 bg-zinc-50">
            <select
              value={deleteMode}
              onChange={(e) => setDeleteMode(e.target.value as "all" | "old")}
              className="flex-1 text-xs border border-zinc-200 rounded-lg px-2.5 py-1.5 bg-white text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="old">Starije od mesec dana</option>
              <option value="all">Sve notifikacije</option>
            </select>
            <button
              onClick={handleDelete}
              disabled={deleteNotifications.isPending}
              className="text-xs px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition disabled:opacity-50"
            >
              {deleteNotifications.isPending ? "..." : "Obriši"}
            </button>
          </div>
        )}
      </MenuItems>
    </Menu>
  );
}
