"use client";

import { useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { BellIcon } from "@heroicons/react/24/outline";
import { formatDistanceToNow } from "date-fns";
import { sr } from "date-fns/locale";
import toast from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import type { INotification } from "@/types";

// ─── Data hooks ───────────────────────────────────────────────────────────────

function useSuperAdminNotifications() {
  const { user } = useAuth();
  return useQuery<INotification[]>({
    queryKey: ["sa-notifications", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/superadmin/notifications?unreadOnly=true", {
        headers: { Authorization: `Bearer ${user!.token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 30_000,
    enabled: !!user?.token,
  });
}

function useSuperAdminNotificationMutations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["sa-notifications"] });

  const markAsRead = useMutation({
    mutationFn: async (ids: string[]) => {
      await fetch("/api/superadmin/notifications/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user!.token}`,
        },
        body: JSON.stringify({ notificationIds: ids }),
      });
    },
    onSuccess: invalidate,
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      await fetch("/api/superadmin/notifications/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user!.token}`,
        },
        body: JSON.stringify({ markAll: true }),
      });
    },
    onSuccess: invalidate,
  });

  const deleteNotifications = useMutation({
    mutationFn: async (mode: "all" | "old") => {
      const res = await fetch(`/api/superadmin/notifications/delete?mode=${mode}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user!.token}` },
      });
      return res.json() as Promise<{ deletedCount: number }>;
    },
    onSuccess: invalidate,
  });

  return { markAsRead, markAllAsRead, deleteNotifications };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  onChatClick,
}: {
  notification: INotification;
  onRead: (id: string) => void;
  onChatClick: () => void;
}) {
  const isChatMsg = notification.type === "chat_message";

  return (
    <MenuItem>
      <button
        onClick={() => {
          onRead(notification._id);
          if (isChatMsg) onChatClick();
        }}
        className={`w-full flex items-start gap-3 px-4 py-3 text-left text-sm hover:bg-slate-700 transition border-b border-slate-700 last:border-0 ${
          notification.isRead ? "opacity-50" : ""
        }`}
      >
        <div className="relative mt-0.5 flex-shrink-0">
          <span className="text-base">{getIcon(notification.type)}</span>
          {!notification.isRead && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-violet-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-xs leading-snug text-slate-100 ${!notification.isRead ? "font-bold" : "font-medium"}`}>
              {notification.title}
            </p>
            <span className="text-[10px] text-slate-500 whitespace-nowrap flex-shrink-0">
              {formatDistanceToNow(new Date(notification.createdAt), {
                addSuffix: true,
                locale: sr,
              })}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
            {notification.message}
          </p>
          {Boolean((notification.metadata as Record<string, unknown>)?.salonName) && (
            <p className="text-[10px] text-violet-400 mt-1 font-medium">
              {String((notification.metadata as Record<string, unknown>).salonName)}
            </p>
          )}
        </div>
      </button>
    </MenuItem>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  onChatClick?: () => void;
}

export function SuperAdminNotificationBell({ onChatClick }: Props) {
  const [deleteMode, setDeleteMode] = useState<"all" | "old">("old");
  const { data: notifications = [] } = useSuperAdminNotifications();
  const { markAsRead, markAllAsRead, deleteNotifications } =
    useSuperAdminNotificationMutations();
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

  const unreadCount = notifications.length;

  function handleRead(id: string) {
    markAsRead.mutate([id]);
  }

  function handleMarkAllRead() {
    if (!notifications.length) return;
    markAllAsRead.mutate(undefined, {
      onSuccess: () => toast.success("Sve notifikacije označene kao pročitane"),
      onError: () => toast.error("Greška pri označavanju"),
    });
  }

  function handleDelete() {
    const label =
      deleteMode === "all" ? "sve notifikacije" : "notifikacije starije od mesec dana";
    if (!confirm(`Obrisati ${label}?`)) return;
    deleteNotifications.mutate(deleteMode, {
      onSuccess: (data) => toast.success(`Obrisano ${data.deletedCount} obaveštenja`),
      onError: () => toast.error("Greška pri brisanju notifikacija"),
    });
  }

  return (
    <Menu as="div" className="relative">
      {/* Bell button */}
      <MenuButton className="cursor-pointer relative flex items-center justify-center w-9 h-9 text-slate-400 bg-slate-700 border border-slate-600 rounded-full transition-colors hover:bg-slate-600 hover:text-white">
        <BellIcon className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-violet-600 rounded-full border-2 border-slate-800">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </MenuButton>

      {/* Dropdown — mobilni: fiksiran uz levu ivicu ekrana; desktop: kao pre (usidren desno uz zvonce) */}
      <MenuItems className="fixed inset-x-3 top-[72px] z-50 origin-top rounded-2xl bg-slate-800 shadow-2xl ring-1 ring-slate-600 focus:outline-none overflow-hidden lg:absolute lg:inset-x-auto lg:right-0 lg:top-auto lg:mt-2 lg:w-96 lg:origin-top-right">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">Obaveštenja</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-900/60 text-violet-300">
                {unreadCount} novo
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-violet-400 hover:text-violet-200 font-medium transition"
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
            className="w-full text-left px-4 py-2.5 text-xs font-medium text-violet-300 hover:bg-slate-700 border-b border-slate-700 transition disabled:opacity-50"
          >
            🔔{" "}
            {pushBusy
              ? "Uključivanje..."
              : permission === "denied"
                ? "Push je blokiran u browseru — omogućite u podešavanjima sajta"
                : "Uključi push notifikacije na ovom uređaju"}
          </button>
        )}

        {/* List */}
        <div className="max-h-[420px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <BellIcon className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-sm text-slate-500">Nema novih obaveštenja</p>
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationItem
                key={n._id}
                notification={n}
                onRead={handleRead}
                onChatClick={() => onChatClick?.()}
              />
            ))
          )}
        </div>

        {/* Footer — delete controls */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-700 bg-slate-900/40">
          <select
            value={deleteMode}
            onChange={(e) => setDeleteMode(e.target.value as "all" | "old")}
            className="flex-1 text-xs border border-slate-600 rounded-lg px-2.5 py-1.5 bg-slate-700 text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="old">Starije od mesec dana</option>
            <option value="all">Sve notifikacije</option>
          </select>
          <button
            onClick={handleDelete}
            disabled={deleteNotifications.isPending}
            className="text-xs px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white font-semibold rounded-lg transition disabled:opacity-50"
          >
            {deleteNotifications.isPending ? "..." : "Obriši"}
          </button>
        </div>
      </MenuItems>
    </Menu>
  );
}
