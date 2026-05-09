"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatAttachment {
  url: string;
  type: "image" | "pdf";
  name: string;
  size: number;
}

export interface ChatMessage {
  _id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  attachments: ChatAttachment[];
  isDeleted: boolean;
  timestamp: string;
}

export interface ChatContact {
  id: string;
  name: string;
  role: string;
  email?: string;
  unread: number;
  lastMessage?: string;
  lastMessageAt?: string;
  isSuperAdmin?: boolean;
}

// ─── useAdminChat ──────────────────────────────────────────────────────────────

export function useAdminChat() {
  const { token, user } = useAuth();

  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);

  const [selectedContact, setSelectedContactState] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);

  const [totalUnread, setTotalUnread] = useState(0);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── Fetch contacts ──────────────────────────────────────────────────────────

  const fetchContacts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/chat/contacts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json() as { contacts: ChatContact[] };
      setContacts(data.contacts ?? []);
    } catch {
      // silently fail on polling errors
    } finally {
      setContactsLoading(false);
    }
  }, [token]);

  // ── Fetch total unread ──────────────────────────────────────────────────────

  const fetchUnread = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/chat/unread", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json() as { total: number };
      setTotalUnread(data.total ?? 0);
    } catch {
      // silently fail
    }
  }, [token]);

  // ── Fetch messages for selected contact ─────────────────────────────────────

  const fetchMessages = useCallback(async (contact: ChatContact) => {
    if (!token) return;
    setMessagesLoading(true);
    try {
      const url = contact.isSuperAdmin
        ? "/api/admin/chat/superadmin"
        : `/api/admin/chat/${contact.id}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      type RawSuperAdminMessage = {
        _id: string;
        senderId: string;
        senderRole: string;
        message: string;
        isRead: boolean;
        timestamp: string;
      };
      const data = await res.json() as { messages?: ChatMessage[] | RawSuperAdminMessage[] };

      if (contact.isSuperAdmin) {
        const raw = (data.messages ?? []) as RawSuperAdminMessage[];
        setMessages(
          raw.map((m) => ({
            _id: m._id,
            senderId: m.senderId,
            senderName: m.senderRole === "superadmin" ? "SuperAdmin" : "Admin",
            senderRole: m.senderRole,
            content: m.message,
            attachments: [],
            isDeleted: false,
            timestamp: m.timestamp,
          })),
        );
      } else {
        setMessages(
          ((data.messages ?? []) as ChatMessage[]).filter((m) => !m.isDeleted),
        );
      }
    } catch {
      // silently fail
    } finally {
      setMessagesLoading(false);
    }
  }, [token]);

  // ── Select contact ──────────────────────────────────────────────────────────

  const selectContact = useCallback(async (contact: ChatContact) => {
    setSelectedContactState(contact);
    setMessages([]);
    await fetchMessages(contact);
    // Mark as read
    await markRead(contact);
    // Update local unread to 0
    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, unread: 0 } : c)),
    );
    fetchUnread();
  }, [fetchMessages, fetchUnread]);

  // ── Mark read ───────────────────────────────────────────────────────────────

  const markRead = async (contact: ChatContact) => {
    if (!token) return;
    const url = contact.isSuperAdmin
      ? "/api/admin/chat/superadmin/read"
      : `/api/admin/chat/${contact.id}/read`;
    try {
      await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore
    }
  };

  // ── Send message ────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async () => {
    if (!token || !selectedContact) return;
    if (!inputText.trim() && pendingAttachments.length === 0) return;
    if (isSending) return;

    setIsSending(true);

    // Optimistic message
    const tempId = `temp-${Date.now()}`;
    const tempMsg: ChatMessage = {
      _id: tempId,
      senderId: user?.id ?? "",
      senderName: user?.name ?? "Admin",
      senderRole: "admin",
      content: inputText.trim(),
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
      const url = selectedContact.isSuperAdmin
        ? "/api/admin/chat/superadmin"
        : `/api/admin/chat/${selectedContact.id}`;

      const res = await fetch(url, {
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
        // Rollback optimistic update
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
        setInputText(prevInput);
        setPendingAttachments(prevAttachments);
        return;
      }

      // Refresh messages from server
      await fetchMessages(selectedContact);
    } catch {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      setInputText(prevInput);
      setPendingAttachments(prevAttachments);
    } finally {
      setIsSending(false);
    }
  }, [token, selectedContact, inputText, pendingAttachments, isSending, user, fetchMessages]);

  // ── Upload file ─────────────────────────────────────────────────────────────

  const uploadFile = useCallback(async (file: File) => {
    if (!token) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/chat/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Upload failed");
      }
      const attachment = await res.json() as ChatAttachment;
      setPendingAttachments((prev) => [...prev, attachment]);
    } finally {
      setIsUploading(false);
    }
  }, [token]);

  // ── Delete message ──────────────────────────────────────────────────────────

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!token || !selectedContact) return;
    const url = selectedContact.isSuperAdmin
      ? `/api/admin/chat/superadmin/message/${messageId}`
      : `/api/admin/chat/${selectedContact.id}/message/${messageId}`;
    try {
      await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, isDeleted: true, content: "", attachments: [] } : m,
        ),
      );
    } catch {
      // ignore
    }
  }, [token, selectedContact]);

  // ── Remove pending attachment ───────────────────────────────────────────────

  const removePendingAttachment = useCallback((index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Polling ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) return;
    fetchContacts();
    fetchUnread();

    pollingRef.current = setInterval(() => {
      fetchContacts();
      fetchUnread();
      if (selectedContact) {
        fetchMessages(selectedContact);
      }
    }, 8000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [token, selectedContact, fetchContacts, fetchUnread, fetchMessages]);

  // Re-run when selected contact changes (clears and restarts interval)
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selectedContact]);

  return {
    // State
    contacts,
    contactsLoading,
    selectedContact,
    messages,
    messagesLoading,
    inputText,
    isSending,
    isUploading,
    pendingAttachments,
    totalUnread,
    fileInputRef,
    // Actions
    selectContact,
    sendMessage,
    uploadFile,
    deleteMessage,
    setInputText,
    removePendingAttachment,
    fetchContacts,
  };
}
