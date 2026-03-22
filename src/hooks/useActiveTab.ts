"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "./useAuth";

interface Tab {
  name: string;
}

interface UseActiveTabProps {
  adminTabs: Tab[];
  clientTabs: Tab[];
}

/**
 * Hook koji automatski postavlja aktivan tab
 * u zavisnosti od tipa korisnika (admin ili klijent),
 * uz podršku za query parametar ?tab=
 */
export function useActiveTab({ adminTabs, clientTabs }: UseActiveTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAdmin, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (isAdmin !== null) {
      const tabs = isAdmin ? adminTabs : clientTabs;
      const queryTab = searchParams.get("tab");

      const validTab =
        queryTab && tabs.some((t) => t.name === queryTab)
          ? queryTab
          : tabs[0].name;

      queueMicrotask(() => {
        setActiveTab(validTab);

        // 🔄 Ako tab u URL-u nije isti, ažuriraj URL
        const current = searchParams.get("tab");
        if (current !== validTab) {
          const newUrl = `/dashboard?tab=${encodeURIComponent(validTab)}`;
          router.replace(newUrl, { scroll: false });
        }
      });
    }
  }, [router, user, isAdmin, adminTabs, clientTabs, searchParams, isLoading]);

  // 🔁 Kad korisnik menja tab (npr. klikom u UI)
  const handleTabChange = (tabName: string) => {
    setActiveTab(tabName);
    const newUrl = `/dashboard?tab=${encodeURIComponent(tabName)}`;
    router.replace(newUrl, { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return { activeTab, handleTabChange, isAdmin };
}
