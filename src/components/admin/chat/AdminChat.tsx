"use client";

import React, { useRef, useEffect, useCallback, memo } from "react";
import Image from "next/image";
import { useAdminChat } from "@/hooks/useAdminChat";
import { useAuth } from "@/hooks/useAuth";
import type {
  ChatContact,
  ChatMessage,
  ChatAttachment,
} from "@/hooks/useAdminChat";
import Link from "next/link";

// ─── Style tokens ─────────────────────────────────────────────────────────────

const card =
  "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleBadge(role: string) {
  const map: Record<string, string> = {
    superadmin:
      "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
    OWNER:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    ADMIN: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    STAFF:
      "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  };
  const label: Record<string, string> = {
    superadmin: "SuperAdmin",
    OWNER: "Owner",
    ADMIN: "Admin",
    STAFF: "Staff",
  };
  const cls =
    map[role] ??
    "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400";
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cls}`}>
      {label[role] ?? role}
    </span>
  );
}

function formatTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday) return formatTime(ts);
  return d.toLocaleDateString("sr-RS", { day: "2-digit", month: "2-digit" });
}

// ─── AttachmentPreview ─────────────────────────────────────────────────────────

function AttachmentBubble({ att }: { att: ChatAttachment }) {
  if (att.type === "image") {
    return (
      <Link
        href={att.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block mt-1"
      >
        <Image
          src={att.url}
          alt={att.name}
          width={200}
          height={200}
          className="rounded-xl max-h-48 w-auto object-cover border border-gray-200 dark:border-gray-700"
        />
      </Link>
    );
  }
  return (
    <Link
      href={att.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 mt-1 px-3 py-2 rounded-xl bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/10 hover:bg-white/30 transition"
    >
      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
        <path
          d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-xs font-medium truncate max-w-[150px]">
        {att.name}
      </span>
    </Link>
  );
}

// ─── MessageBubble — memoized so polling re-fetches don't re-render unchanged bubbles ──

const MessageBubble = memo(function MessageBubble({
  msg,
  myId,
  onDelete,
}: {
  msg: ChatMessage;
  myId: string;
  onDelete: (id: string) => void;
}) {
  const isMe = msg.senderId === myId;
  const isTemp = msg._id.startsWith("temp-");

  if (msg.isDeleted) {
    return (
      <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1`}>
        <span className="text-xs text-gray-400 dark:text-gray-600 italic px-4 py-1">
          Poruka je obrisana
        </span>
      </div>
    );
  }

  return (
    <div
      className={`group flex ${isMe ? "justify-end" : "justify-start"} mb-2`}
    >
      <div
        className={`relative max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col`}
      >
        {!isMe && (
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 mb-0.5 px-1">
            {msg.senderName}
          </p>
        )}

        <div
          className={`px-4 py-2.5 rounded-2xl ${
            isMe
              ? "bg-violet-600 text-white rounded-br-sm"
              : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm"
          } ${isTemp ? "opacity-70" : ""}`}
        >
          {msg.content && (
            <p className="text-sm leading-relaxed">{msg.content}</p>
          )}
          {(msg.attachments ?? []).map((att, i) => (
            <AttachmentBubble key={i} att={att} />
          ))}
          <p
            className={`text-[10px] mt-1 ${
              isMe ? "text-violet-200" : "text-gray-400 dark:text-gray-500"
            } ${isTemp ? "italic" : ""}`}
          >
            {isTemp ? "šalje se..." : formatTime(msg.timestamp)}
          </p>
        </div>

        {/* Delete button — only for own non-temp messages */}
        {isMe && !isTemp && (
          <button
            onClick={() => onDelete(msg._id)}
            className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Obriši poruku"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
});

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex justify-end mb-2">
      <div className="px-4 py-2.5 rounded-2xl rounded-br-sm bg-violet-600/60">
        <div className="flex gap-1 items-center h-4">
          {[0, 0.15, 0.3].map((delay, i) => (
            <span
              key={i}
              className="w-2 h-2 bg-white rounded-full animate-bounce"
              style={{ animationDelay: `${delay}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ContactItem ──────────────────────────────────────────────────────────────

function ContactItem({
  contact,
  isSelected,
  onSelect,
}: {
  contact: ChatContact;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-3 rounded-xl transition-colors relative ${
        isSelected
          ? "bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/40"
          : "hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-transparent"
      }`}
    >
      <div className="flex items-center gap-2.5">
        {/* Avatar */}
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
            contact.isSuperAdmin
              ? "bg-gradient-to-br from-violet-600 to-purple-700 text-white"
              : "bg-gradient-to-br from-gray-400 to-gray-500 text-white"
          }`}
        >
          {contact.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
              {contact.name}
            </span>
            {contact.lastMessageAt && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                {formatDate(contact.lastMessageAt)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-1 mt-0.5">
            <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
              {contact.lastMessage || "Nema poruka"}
            </span>
            {contact.unread > 0 && (
              <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center px-1 animate-pulse">
                {contact.unread > 9 ? "9+" : contact.unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── AdminChat ────────────────────────────────────────────────────────────────

export function AdminChat() {
  const { user } = useAuth();
  const chat = useAdminChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const myId = user?.tenantUserId ?? user?.id ?? "";

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages, chat.isSending]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        chat.sendMessage();
      }
    },
    [chat],
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      await chat.uploadFile(file);
    },
    [chat],
  );

  return (
    <div className="flex gap-4 h-[calc(100vh-13rem)]">
      {/* ── Left panel: contacts ─────────────────────────────────────────── */}
      {/* Mobile: full width; hidden once a contact is selected. Desktop: fixed sidebar, always visible. */}
      <div
        className={`${card} ${
          chat.selectedContact ? "hidden md:flex" : "flex"
        } w-full md:w-72 flex-shrink-0 flex-col overflow-hidden`}
      >
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white">Chat</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Razgovori sa timom
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {chat.contactsLoading ? (
            <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
              <span className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin mr-2" />
              Učitavanje...
            </div>
          ) : chat.contacts.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Nema dostupnih kontakata.
              </p>
            </div>
          ) : (
            chat.contacts.map((contact) => (
              <ContactItem
                key={contact.id}
                contact={contact}
                isSelected={chat.selectedContact?.id === contact.id}
                onSelect={() => chat.selectContact(contact)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right panel: messages ────────────────────────────────────────── */}
      {/* Mobile: hidden until a contact is selected, then full width. Desktop: always visible. */}
      <div
        className={`${card} ${
          chat.selectedContact ? "flex" : "hidden md:flex"
        } flex-1 flex-col overflow-hidden`}
      >
        {!chat.selectedContact ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-violet-500"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="font-semibold text-gray-700 dark:text-gray-300">
              Izaberite kontakt
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Kliknite na kontakt sa leve strane da otvorite razgovor.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
              {/* Mobile back button — returns to the contacts list */}
              <button
                onClick={chat.clearSelectedContact}
                className="md:hidden flex-shrink-0 -ml-1 w-8 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                title="Nazad na listu"
                aria-label="Nazad na listu"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M15 18l-6-6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  chat.selectedContact.isSuperAdmin
                    ? "bg-gradient-to-br from-violet-600 to-purple-700 text-white"
                    : "bg-gradient-to-br from-gray-400 to-gray-500 text-white"
                }`}
              >
                {chat.selectedContact.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    {chat.selectedContact.name}
                  </p>
                  {roleBadge(chat.selectedContact.role)}
                </div>
                {chat.selectedContact.email && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {chat.selectedContact.email}
                  </p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {chat.messagesLoading ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  <span className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin mr-2" />
                  Učitavanje poruka...
                </div>
              ) : chat.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Nema poruka. Pošaljite prvu poruku!
                  </p>
                </div>
              ) : (
                <>
                  {chat.messages.map((msg) => (
                    <MessageBubble
                      key={msg._id}
                      msg={msg}
                      myId={myId}
                      onDelete={chat.deleteMessage}
                    />
                  ))}
                  {chat.isSending && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Pending attachments preview */}
            {chat.pendingAttachments.length > 0 && (
              <div className="px-4 pb-1 flex flex-wrap gap-2">
                {chat.pendingAttachments.map((att, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  >
                    {att.type === "image" ? (
                      <Image
                        src={att.url}
                        alt={att.name}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <svg
                        className="w-5 h-5 text-red-500 flex-shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                    <span className="text-xs text-gray-600 dark:text-gray-400 max-w-[100px] truncate">
                      {att.name}
                    </span>
                    <button
                      onClick={() => chat.removePendingAttachment(i)}
                      className="text-gray-400 hover:text-red-500 transition ml-0.5"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input area */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-end gap-2">
                {/* File upload button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={chat.isUploading}
                  title="Priloži fajl (JPG, PNG, WebP, PDF – max 20MB)"
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-xl transition disabled:opacity-50"
                >
                  {chat.isUploading ? (
                    <span className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* Text input */}
                <textarea
                  value={chat.inputText}
                  onChange={(e) => chat.setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Napišite poruku... (Enter za slanje)"
                  rows={1}
                  disabled={chat.isSending}
                  className="flex-1 resize-none border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400 transition placeholder:text-gray-400 dark:placeholder:text-gray-500 max-h-32 disabled:opacity-60"
                  style={{ overflowY: "auto" }}
                />

                {/* Send button */}
                <button
                  onClick={chat.sendMessage}
                  disabled={
                    (!chat.inputText.trim() &&
                      chat.pendingAttachments.length === 0) ||
                    chat.isSending
                  }
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Pošalji (Enter)"
                >
                  {chat.isSending ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1.5 ml-12">
                Enter za slanje · Shift+Enter za novi red · JPG, PNG, WebP, PDF
                do 20MB
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
