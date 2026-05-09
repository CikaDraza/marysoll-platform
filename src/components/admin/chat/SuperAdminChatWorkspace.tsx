"use client";

import React, { useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useSuperAdminChat } from "@/hooks/useSuperAdminChat";
import type { SAMessage, SAAttachment } from "@/hooks/useSuperAdminChat";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" });
}

// ─── AttachmentBubble ─────────────────────────────────────────────────────────

function AttachmentBubble({ att }: { att: SAAttachment }) {
  if (att.type === "image") {
    return (
      <a href={att.url} target="_blank" rel="noopener noreferrer" className="block mt-1">
        <Image
          src={att.url}
          alt={att.name}
          width={200}
          height={200}
          className="rounded-xl max-h-48 object-cover border border-white/20"
        />
      </a>
    );
  }
  return (
    <a
      href={att.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 mt-1 px-3 py-2 rounded-xl bg-white/20 border border-white/30 hover:bg-white/30 transition"
    >
      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
        <path
          d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        />
        <path
          d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
      <span className="text-xs font-medium truncate max-w-[150px]">{att.name}</span>
    </a>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  myId,
  onDelete,
}: {
  msg: SAMessage;
  myId: string;
  onDelete: (id: string) => void;
}) {
  const isMe = msg.senderId === myId;
  const isTemp = msg._id.startsWith("temp-");

  if (msg.isDeleted) {
    return (
      <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1`}>
        <span className="text-xs text-slate-500 italic px-4 py-1">Poruka je obrisana</span>
      </div>
    );
  }

  return (
    <div className={`group flex ${isMe ? "justify-end" : "justify-start"} mb-2`}>
      <div className={`relative max-w-[70%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
        {!isMe && (
          <p className="text-[10px] font-semibold text-slate-400 mb-0.5 px-1">
            {msg.senderRole === "owner" ? "Vlasnik" : "SuperAdmin"}
          </p>
        )}

        <div
          className={`px-4 py-2.5 rounded-2xl ${
            isMe
              ? "bg-violet-600 text-white rounded-br-sm"
              : "bg-slate-700 text-slate-200 rounded-bl-sm"
          } ${isTemp ? "opacity-70" : ""}`}
        >
          {msg.message && <p className="text-sm leading-relaxed">{msg.message}</p>}
          {(msg.attachments ?? []).map((att, i) => (
            <AttachmentBubble key={i} att={att} />
          ))}
          <p className={`text-[10px] mt-1 ${isMe ? "text-violet-200" : "text-slate-400"} ${isTemp ? "italic" : ""}`}>
            {isTemp ? "šalje se..." : formatTime(msg.timestamp)}
          </p>
        </div>

        {/* Delete button — own messages only */}
        {isMe && !isTemp && (
          <button
            onClick={() => onDelete(msg._id)}
            className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-900/20"
            title="Obriši poruku"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── TypingIndicator ──────────────────────────────────────────────────────────

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

// ─── SuperAdminChatWorkspace ──────────────────────────────────────────────────

interface Props {
  tenantId: string;
  tenantName: string;
  ownerEmail?: string;
}

export function SuperAdminChatWorkspace({ tenantId, tenantName, ownerEmail }: Props) {
  const chat = useSuperAdminChat(tenantId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages, chat.isSending]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void chat.sendMessage();
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-700 mb-3 flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
          {tenantName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-white text-sm">{tenantName}</p>
          {ownerEmail && <p className="text-xs text-slate-400">{ownerEmail}</p>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {chat.messagesLoading ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            <span className="w-4 h-4 border-2 border-violet-400 border-t-violet-200 rounded-full animate-spin mr-2" />
            Učitavanje poruka...
          </div>
        ) : chat.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-slate-500">Nema poruka. Pošaljite prvu poruku!</p>
          </div>
        ) : (
          <>
            {chat.messages.map((msg) => (
              <MessageBubble
                key={msg._id}
                msg={msg}
                myId={chat.myId}
                onDelete={chat.deleteMessage}
              />
            ))}
            {chat.isSending && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Pending attachments */}
      {chat.pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 py-2 flex-shrink-0">
          {chat.pendingAttachments.map((att, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-700 border border-slate-600"
            >
              {att.type === "image" ? (
                <Image src={att.url} alt={att.name} width={32} height={32}
                  className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <svg className="w-5 h-5 text-red-400 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <span className="text-xs text-slate-300 max-w-[100px] truncate">{att.name}</span>
              <button onClick={() => chat.removePendingAttachment(i)} className="text-slate-400 hover:text-red-400 transition ml-0.5">
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-slate-700 pt-3 flex-shrink-0">
        <div className="flex items-end gap-2">
          {/* File upload */}
          <button
            type="button"
            onClick={() => chat.fileInputRef.current?.click()}
            disabled={chat.isUploading}
            title="Priloži fajl (JPG, PNG, WebP, PDF – max 20MB)"
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-violet-400 hover:bg-violet-900/20 rounded-xl transition disabled:opacity-50"
          >
            {chat.isUploading ? (
              <span className="w-4 h-4 border-2 border-violet-400 border-t-violet-200 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
          <input
            ref={chat.fileInputRef}
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
            className="flex-1 resize-none border border-slate-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 bg-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 transition placeholder:text-slate-500 max-h-32 disabled:opacity-60"
            style={{ overflowY: "auto" }}
          />

          {/* Send */}
          <button
            onClick={() => void chat.sendMessage()}
            disabled={(!chat.inputText.trim() && chat.pendingAttachments.length === 0) || chat.isSending}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Pošalji (Enter)"
          >
            {chat.isSending ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-[10px] text-slate-600 mt-1.5 ml-12">
          Enter za slanje · Shift+Enter za novi red · JPG, PNG, WebP, PDF do 20MB
        </p>
      </div>
    </div>
  );
}
