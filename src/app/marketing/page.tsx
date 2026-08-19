"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

const marketingCards = [
  {
    href: "/marketing/campaigns/drafts",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    label: "Email Campaign AI",
    description: "Kreiraj i upravljaj AI-generisanim email kampanjama",
    badge: "Enterprise",
    color: "from-violet-500 to-purple-600",
    subLinks: [
      { href: "/marketing/campaigns/drafts", label: "Drafts" },
      { href: "/marketing/campaigns/scheduled", label: "Scheduled" },
      { href: "/marketing/campaigns/sent", label: "Sent" },
    ],
  },
  {
    href: "/marketing/analytics",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M18 20V10M12 20V4M6 20v-6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    label: "Campaign Analytics",
    description: "Otvori rate, klik rate i performanse kampanja",
    badge: "Soon",
    color: "from-blue-500 to-cyan-600",
    subLinks: [],
  },
  {
    href: "/marketing/ab-test",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    label: "A/B Subject Test",
    description: "Testiraj različite subject linije i pronađi pobednika",
    badge: "Soon",
    color: "from-amber-500 to-orange-600",
    subLinks: [],
  },
  {
    href: "/marketing/audience",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    label: "Audience Segmentation",
    description: "Segmentiraj klijente po ponašanju, lokaciji i aktivnosti",
    badge: "Soon",
    color: "from-emerald-500 to-teal-600",
    subLinks: [],
  },
];

export default function MarketingPage() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && (!user || (!user.isAdmin && !user.isSuperAdmin))) {
      // Isti origin (klijent) — dev/staging ne ispadaju na produkciju.
      window.location.replace("/login");
    }
  }, [isLoading, user]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-[11px] font-bold text-violet-500 uppercase tracking-widest mb-1">
          Marketing
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Marketing Hub
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Upravljaj kampanjama, analizom i segmentacijom publike
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {marketingCards.map((card) => (
          <div
            key={card.href}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className={`bg-gradient-to-br ${card.color} p-5`}>
              <div className="flex items-start justify-between">
                <div className="text-white opacity-90">{card.icon}</div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {card.badge}
                </span>
              </div>
              <h2 className="mt-3 text-base font-bold text-white leading-snug">
                {card.label}
              </h2>
              <p className="mt-1 text-[12px] text-white/80 leading-relaxed">
                {card.description}
              </p>
            </div>

            {/* Body */}
            <div className="p-4 flex-1 flex flex-col gap-2">
              {card.subLinks.length > 0 ? (
                card.subLinks.map((sub) => (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                  >
                    <span>{sub.label}</span>
                    <svg
                      className="w-4 h-4 text-gray-400 group-hover:text-violet-500 transition-colors"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M9 18l6-6-6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                ))
              ) : (
                <Link
                  href={card.href}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                >
                  Coming soon
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
