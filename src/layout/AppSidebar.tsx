"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/hooks/useAuth";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { useChatUnread } from "@/hooks/useChatUnread";
import { usePlanStatus } from "@/hooks/usePlanStatus";
import Image from "next/image";

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icon = ({ d, size = 20 }: { d: string | string[]; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {(Array.isArray(d) ? d : [d]).map((path, i) => (
      <path
        key={i}
        d={path}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ))}
  </svg>
);

const icons = {
  dashboard:
    "M11.875 6.25V0H20V6.25H11.875ZM0 10V0H8.125V10H0ZM11.875 20V10H20V20H11.875ZM0 20V13.75H8.125V20H0ZM1 9H7V1H1V9ZM12.5 19H19V11H12.5V19ZM13 5.5H19V1H13V5.5ZM0.5 19.5H7.5V14.5H0.5V19.5Z",
  calendar:
    "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  scissors:
    "M6 3L20 17M6 21L20 7M6 3a3 3 0 100 6 3 3 0 000-6zM20 7a3 3 0 100 6 3 3 0 000-6z",
  chart: "M18 20V10M12 20V4M6 20v-6",
  mail: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  globe:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20",
  link: "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  clock:
    "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2",
  dots: "M5 12h.01M12 12h.01M19 12h.01",
  chevron: "M6 9l6 6 6-6",
  users:
    "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
};

// ─── Nav config ───────────────────────────────────────────────────────────────

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  tab?: string; // for dashboard tab navigation
  subItems?: { name: string; path?: string; tab?: string; badge?: string }[];
};

const AdminNav: NavItem[] = [
  {
    name: "Dashboard",
    icon: <Icon d={icons.dashboard} />,
    subItems: [
      { name: "Profil salona", tab: "profil" },
      { name: "Radno vreme", tab: "radno-vreme" },
      { name: "Social & SEO", tab: "social-seo" },
      { name: "Landing CMS", tab: "cms" },
    ],
  },
  {
    name: "Usluge",
    icon: <Icon d={icons.scissors} />,
    path: "/dashboard?tab=usluge",
  },
  {
    name: "Termini",
    icon: <Icon d={icons.clock} />,
    subItems: [
      { name: "Lista termina", tab: "termini" },
      { name: "Kalendar", tab: "kalendar" },
    ],
  },
  {
    name: "Klijenti",
    icon: <Icon d={icons.users} />,
    path: "/dashboard?tab=klijenti",
  },
  {
    name: "Statistika",
    icon: <Icon d={icons.chart} />,
    path: "/dashboard?tab=statistika",
  },
  {
    name: "Newsletter",
    icon: <Icon d={icons.mail} />,
    path: "/dashboard?tab=newsletter",
  },
  {
    name: "Marketing",
    icon: <Icon d="M13 10V3L4 14h7v7l9-11h-7z" />,
    subItems: [
      {
        name: "Email Campaign AI",
        tab: "email-campaign-ai",
        badge: "Enterprise",
      },
      {
        name: "Drafts",
        path: "/marketing/campaigns/drafts",
      },
      {
        name: "Scheduled",
        path: "/marketing/campaigns/scheduled",
      },
      {
        name: "Sent",
        path: "/marketing/campaigns/sent",
      },
      {
        name: "Campaign Analytics",
        path: "/marketing/analytics",
      },
      {
        name: "A/B Subject Test",
        path: "/marketing/ab-test",
      },
      {
        name: "Audience Segmentation",
        path: "/marketing/audience",
      },
    ],
  },
  {
    name: "Preporuke",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    path: "/dashboard?tab=preporuke",
  },
  {
    name: "Custom domen",
    icon: <Icon d={icons.link} />,
    path: "/dashboard?tab=domen",
  },
  {
    name: "Pretplata",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M2 7a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2 10h20"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
    path: "/dashboard?tab=pretplata",
  },
  {
    name: "Chat",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    path: "/dashboard?tab=chat",
  },
];

// ─── Plan badge in sidebar footer ─────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  maria: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  claudia: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  kiki: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
  enterprise:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
};

// ─── AppSidebar ───────────────────────────────────────────────────────────────

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, closeMobileSidebar } =
    useSidebar();
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const tenant = useTenantAdmin();

  const chatUnread = useChatUnread();

  const [openSubmenu, setOpenSubmenu] = useState<number | null>(() => {
    // Auto-open the Marketing submenu when on /marketing/* routes
    if (
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/marketing")
    ) {
      return AdminNav.findIndex((item) => item.name === "Marketing");
    }
    return null;
  });
  const [subMenuHeight, setSubMenuHeight] = useState<Record<number, number>>(
    {},
  );
  const subMenuRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const isVisible = isExpanded || isHovered || isMobileOpen;
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    async function handleMounted() {
      setIsMounted(true);
    }
    handleMounted();
  }, []);

  // Determine active state
  const isActive = useCallback(
    (item: NavItem) => {
      if (item.path) return pathname.startsWith(item.path.split("?")[0]);
      if (item.subItems) {
        return item.subItems.some((s) =>
          s.path ? pathname.startsWith(s.path.split("?")[0]) : false,
        );
      }
      return false;
    },
    [pathname],
  );

  // Handle submenu height animation
  useEffect(() => {
    if (openSubmenu !== null) {
      const el = subMenuRefs.current[openSubmenu];
      if (el)
        setSubMenuHeight((p) => ({ ...p, [openSubmenu]: el.scrollHeight }));
    }
  }, [openSubmenu]);

  const handleNav = (path?: string) => {
    if (path) {
      router.push(path);
      closeMobileSidebar(); // zatvori mobilni drawer nakon izbora taba
    }
  };

  const salonUrl = tenant.getTenantUrl?.();

  const { data: planStatusData } = usePlanStatus();
  const plan = planStatusData?.plan ?? "maria";

  return (
    <aside
      className={`fixed top-0 left-0 flex flex-col h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-50 transition-all duration-300 ease-in-out
        ${isExpanded || isMobileOpen ? "w-[260px]" : isHovered ? "w-[260px]" : "w-[72px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div
        className={`flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 ${!isVisible ? "justify-center" : ""}`}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          {/* Monogram icon — always visible */}
          <Image
            src="/marysoll_elegant_logo.png"
            alt="Marysoll logo"
            width={40}
            height={40}
            className="rounded-2xl"
          />
          {isVisible && (
            <div className="min-w-0">
              <span className="block text-sm font-bold text-gray-900 dark:text-white leading-none">
                Marysoll
              </span>
              <span className="block text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                Beauty Platform
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5 scrollbar-none">
        {isVisible && (
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">
            Meni
          </p>
        )}

        {AdminNav.map((item, idx) => {
          const active = isActive(item);
          const submenuOpen = openSubmenu === idx;

          return (
            <div key={item.name}>
              <button
                onClick={() => {
                  if (item.subItems) {
                    setOpenSubmenu(submenuOpen ? null : idx);
                  } else {
                    handleNav(item.path);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${
                    active
                      ? "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
                  }
                  ${!isVisible ? "justify-center" : ""}
                `}
              >
                <span
                  className={`flex-shrink-0 ${active ? "text-violet-600 dark:text-violet-400" : "text-gray-500 dark:text-gray-400"}`}
                >
                  {item.icon}
                </span>

                {isVisible && (
                  <>
                    <span className="flex-1 text-left truncate">
                      {item.name}
                    </span>
                    {item.name === "Chat" && chatUnread > 0 && (
                      <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center px-1 animate-pulse">
                        {chatUnread > 9 ? "9+" : chatUnread}
                      </span>
                    )}
                    {item.subItems && (
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 text-gray-400 ${isMounted && submenuOpen ? "rotate-180 text-violet-500" : "rotate-0 text-gray-400"}`}
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d={icons.chevron}
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </>
                )}
              </button>

              {/* Submenu */}
              {item.subItems && isVisible && (
                <div
                  ref={(el) => {
                    subMenuRefs.current[idx] = el;
                  }}
                  className="overflow-hidden transition-all duration-200"
                  style={{
                    height: submenuOpen
                      ? `${subMenuHeight[idx] ?? 0}px`
                      : "0px",
                  }}
                >
                  <ul className="mt-1 ml-9 space-y-0.5 pb-1">
                    {item.subItems.map((sub) => {
                      const subPath =
                        sub.path ??
                        (sub.tab ? `/dashboard?tab=${sub.tab}` : "#");
                      return (
                        <li key={sub.name}>
                          <Link
                            href={subPath}
                            onClick={closeMobileSidebar}
                            className="block px-3 py-2 text-sm rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200 transition-colors"
                          >
                            {sub.name && sub.badge ? (
                              <span className="flex flex-col items-start gap-0">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
                                  {sub.badge}
                                </span>
                                <span>{sub.name}</span>
                              </span>
                            ) : (
                              <span>{sub.name}</span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })}

        {/* Salon website link */}
        {isVisible && (
          <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-800">
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">
              Ostalo
            </p>
            <Link
              href="https://marysoll.com"
              target="_blank"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200 transition-colors"
            >
              <span className="text-gray-500 dark:text-gray-400">
                <Icon d={icons.globe} />
              </span>
              <span>Sajt Platforme</span>
              <svg
                className="w-3.5 h-3.5 ml-auto text-gray-300"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M7 17L17 7M17 7H7M17 7v10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            {/* Salon website */}
            {salonUrl && (
              <Link
                href={salonUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex md:hidden items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-violet-600 bg-violet-50 dark:bg-violet-500/10 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200 transition-colors"
              >
                <span className="text-gray-500 dark:text-gray-400">
                  <Icon d={icons.globe} />
                </span>
                <span>Sajt Salona</span>
                <svg
                  className="w-3.5 h-3.5 ml-auto text-gray-300"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M7 17L17 7M17 7H7M17 7v10"
                    stroke="rgb(127, 34, 254)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            )}
          </div>
        )}
      </nav>

      {/* Footer: user + plan */}
      {isVisible && user && (
        <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                {user.name}
              </p>
              <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
            </div>
            <span
              className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full flex-shrink-0 ${PLAN_COLORS[plan]}`}
            >
              {plan}
            </span>
          </div>
        </div>
      )}

      {/* Collapsed footer */}
      {!isVisible && user && (
        <div className="flex-shrink-0 p-3 border-t border-gray-100 dark:border-gray-800 flex justify-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
            {user.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
        </div>
      )}
    </aside>
  );
};

export default AppSidebar;
