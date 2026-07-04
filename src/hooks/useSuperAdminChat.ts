"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { mergeChatMessages } from "@/lib/chat/mergeMessages";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SAAttachment {
  url: string;
  type: "image" | "pdf";
  name: string;
  size: number;
}

export interface SAMessage {
  _id: string;
  senderId: string;
  senderRole: "superadmin" | "owner";
  message: string;
  attachments: SAAttachment[];
  isDeleted: boolean;
  timestamp: string;
}

// Stabilan merge (očuvanje referenci za React.memo) je u @/lib/chat/mergeMessages;
// superadmin poruke se porede po `message` polju.
const mergeMessages = (prev: SAMessage[], incoming: SAMessage[]) =>
  mergeChatMessages(prev, incoming, (a, b) => a.message === b.message);

// ─── useSuperAdminChat ────────────────────────────────────────────────────────

export function useSuperAdminChat(tenantId: string | null) {
  const { token, user } = useAuth();

  const [messages, setMessages] = useState<SAMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<SAAttachment[]>(
    [],
  );

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  // Tracks whether the initial load has completed — poll fetches skip the loading spinner
  const initialLoadDone = useRef(false);

  const myId = user?.id ?? "";

  // ── Fetch messages ──────────────────────────────────────────────────────────

  const fetchMessages = useCallback(
    async (tid: string, showLoading = false) => {
      if (!token) return;
      if (showLoading) setMessagesLoading(true);
      try {
        const res = await fetch(`/api/superadmin/chat/${tid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { messages?: SAMessage[] };
        const incoming = data.messages ?? [];
        setMessages((prev) => mergeMessages(prev, incoming));
      } catch {
        // silently fail on poll
      } finally {
        if (showLoading) setMessagesLoading(false);
        initialLoadDone.current = true;
      }
    },
    [token],
  );

  // ── Mark as read ────────────────────────────────────────────────────────────

  const markRead = useCallback(
    async (tid: string) => {
      if (!token) return;
      try {
        await fetch(`/api/superadmin/chat/${tid}/read`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore
      }
    },
    [token],
  );

  // ── Send message ────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async () => {
    if (!token || !tenantId) return;
    if (!inputText.trim() && pendingAttachments.length === 0) return;
    if (isSending) return;

    setIsSending(true);

    const tempId = `temp-${Date.now()}`;
    const tempMsg: SAMessage = {
      _id: tempId,
      senderId: myId,
      senderRole: "superadmin",
      message: inputText.trim(),
      attachments: pendingAttachments,
      isDeleted: false,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMsg]);
    const prevInput = inputText;
    const prevAttachments = pendingAttachments;
    setInputText("");
    setPendingAttachments([]);

    try {
      const res = await fetch(`/api/superadmin/chat/${tenantId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: prevInput.trim(),
          attachments: prevAttachments,
        }),
      });

      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
        setInputText(prevInput);
        setPendingAttachments(prevAttachments);
        return;
      }

      // Remove all temp messages before fetching so they don't linger alongside the real one
      setMessages((prev) => prev.filter((m) => !m._id.startsWith("temp-")));
      await fetchMessages(tenantId);
    } catch {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      setInputText(prevInput);
      setPendingAttachments(prevAttachments);
    } finally {
      setIsSending(false);
    }
  }, [
    token,
    tenantId,
    inputText,
    pendingAttachments,
    isSending,
    myId,
    fetchMessages,
  ]);

  // ── Upload file ─────────────────────────────────────────────────────────────

  const uploadFile = useCallback(
    async (file: File) => {
      if (!token) return;
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/superadmin/chat/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          throw new Error(err.error ?? "Upload failed");
        }
        const att = (await res.json()) as SAAttachment;
        setPendingAttachments((prev) => [...prev, att]);
      } finally {
        setIsUploading(false);
      }
    },
    [token],
  );

  // ── Delete message ──────────────────────────────────────────────────────────

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!token || !tenantId) return;
      try {
        await fetch(`/api/superadmin/chat/${tenantId}/message/${messageId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId
              ? { ...m, isDeleted: true, message: "", attachments: [] }
              : m,
          ),
        );
      } catch {
        // ignore
      }
    },
    [token, tenantId],
  );

  // ── Remove pending attachment ───────────────────────────────────────────────

  const removePendingAttachment = useCallback((index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Load & poll when tenantId changes ──────────────────────────────────────

  useEffect(() => {
    if (!token || !tenantId) {
      async function reset() {
        setMessages([]);
      }
      reset();
      initialLoadDone.current = false;
      return;
    }

    const currentTenantId = tenantId;
    initialLoadDone.current = false;
    async function init() {
      await fetchMessages(currentTenantId, true);
      await markRead(currentTenantId);
    }
    void init();

    pollingRef.current = setInterval(() => {
      void fetchMessages(currentTenantId, false);
    }, 10000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [token, tenantId, fetchMessages, markRead]);

  return {
    myId,
    messages,
    messagesLoading,
    inputText,
    isSending,
    isUploading,
    pendingAttachments,
    setInputText,
    sendMessage,
    uploadFile,
    deleteMessage,
    removePendingAttachment,
  };
}
