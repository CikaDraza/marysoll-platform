"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export function useChatUnread() {
  const { token, user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!token || !user?.isAdmin) return;

    let active = true;

    async function fetch_() {
      try {
        const res = await fetch("/api/admin/chat/unread", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || !active) return;
        const data = await res.json() as { total: number };
        setUnread(data.total ?? 0);
      } catch {
        // ignore
      }
    }

    fetch_();
    const id = setInterval(fetch_, 15000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [token, user?.isAdmin]);

  return unread;
}
