"use client";

/**
 * AuthStatusButton
 *
 * Prikazuje se na marketing, admin i superadmin stranicama.
 * Pokazuje ko je trenutno prijavljen i dugme za odjavu.
 * Rešava problem: ne moraš ručno brisati token da se odjaviš.
 */

import { useState, useEffect } from "react";
import { getRawToken, getUserFromToken } from "@/lib/auth/auth-client";
import { useAuth } from "@/hooks/useAuth";
import type { DecodedUser } from "@/types/auth/types";
import Link from "next/link";

interface AuthStatusButtonProps {
  /** Gde da preusmeri posle odjave. Default: "/" */
  logoutRedirect?: string;
  /** Visual theme - "dark" za superadmin/admin (tamna pozadina), "light" za marketing */
  theme?: "dark" | "light";
}

export function AuthStatusButton({ theme = "light" }: AuthStatusButtonProps) {
  const { logout } = useAuth();
  const [user, setUser] = useState<DecodedUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Read user from token on mount (client-only)
  useEffect(() => {
    async function handleUserFromToken() {
      const token = getRawToken();
      const user = getUserFromToken(token || "");
      return setUser(user || null);
    }
    handleUserFromToken();
  }, []);

  function handleLogout() {
    setIsOpen(false);
    // useAuth.logout: briše tokene, cookie, zove API, preusmeri na login
    logout();
  }

  const isDark = theme === "dark";

  if (!user) {
    return (
      <Link
        href="/login"
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition
          ${
            isDark
              ? "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white border border-slate-600"
              : "text-sm text-gray-600 hover:text-violet-600"
          }
        `}
      >
        <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
        Prijavi se
      </Link>
    );
  }

  const roleLabel = user.isSuperAdmin
    ? "SuperAdmin"
    : user.isAdmin
      ? "Admin"
      : "Klijent";

  const roleBadgeColor = user.isSuperAdmin
    ? isDark
      ? "bg-violet-900/60 text-violet-300"
      : "bg-violet-100 text-violet-700"
    : user.isAdmin
      ? isDark
        ? "bg-blue-900/60 text-blue-300"
        : "bg-blue-100 text-blue-700"
      : isDark
        ? "bg-emerald-900/60 text-emerald-300"
        : "bg-emerald-100 text-emerald-700";

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition
          ${
            isDark
              ? "bg-slate-700 text-white hover:bg-slate-600 border border-slate-600"
              : "bg-white text-gray-800 hover:bg-gray-50 border border-gray-200 shadow-sm"
          }
        `}
      >
        {/* Online indicator */}
        <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />

        {/* Name */}
        <span className="max-w-[120px] truncate">{user.name}</span>

        {/* Role badge */}
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${roleBadgeColor}`}
        >
          {roleLabel}
        </span>

        {/* Chevron */}
        <svg
          className={`w-3 h-3 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""} ${isDark ? "text-slate-400" : "text-gray-400"}`}
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M2 4l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div
            className={`
            absolute right-0 top-full mt-1.5 z-50 w-56 rounded-xl shadow-xl border overflow-hidden
            ${
              isDark
                ? "bg-slate-800 border-slate-700"
                : "bg-white border-gray-100"
            }
          `}
          >
            {/* User info */}
            <div
              className={`px-4 py-3 border-b ${isDark ? "border-slate-700" : "border-gray-100"}`}
            >
              <p
                className={`text-xs font-bold ${isDark ? "text-white" : "text-gray-900"}`}
              >
                {user.name}
              </p>
              <p
                className={`text-[11px] mt-0.5 truncate ${isDark ? "text-slate-400" : "text-gray-500"}`}
              >
                {user.email}
              </p>
              <span
                className={`inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-bold ${roleBadgeColor}`}
              >
                {roleLabel}
              </span>
            </div>

            {/* Navigation shortcuts */}
            <div
              className={`py-1 border-b ${isDark ? "border-slate-700" : "border-gray-100"}`}
            >
              {user.isSuperAdmin && (
                <Link
                  href="/superadmin/dashboard"
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs transition ${isDark ? "text-slate-300 hover:bg-slate-700 hover:text-white" : "text-gray-700 hover:bg-gray-50"}`}
                >
                  🛡️ SuperAdmin panel
                </Link>
              )}
              {user.isAdmin && !user.isSuperAdmin && (
                <Link
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs transition ${isDark ? "text-slate-300 hover:bg-slate-700 hover:text-white" : "text-gray-700 hover:bg-gray-50"}`}
                >
                  🏪 Admin dashboard
                </Link>
              )}
              {!user.isAdmin && !user.isSuperAdmin && (
                <Link
                  href="/termini"
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs transition ${isDark ? "text-slate-300 hover:bg-slate-700 hover:text-white" : "text-gray-700 hover:bg-gray-50"}`}
                >
                  📅 Moji termini
                </Link>
              )}
            </div>

            {/* Logout */}
            <div className="py-1">
              <button
                onClick={handleLogout}
                className={`w-full flex items-center gap-2 px-4 py-2 text-xs text-left font-semibold transition ${isDark ? "text-red-400 hover:bg-red-900/30 hover:text-red-300" : "text-red-600 hover:bg-red-50"}`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Odjavi se
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
