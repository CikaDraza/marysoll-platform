"use client";
/**
 * MarketingProvider — JEDAN izvor istine za Marketing tab (superadmin CMS).
 *
 * useMarketingCms i useCmsPages se pozivaju tačno JEDNOM ovde; sekcije,
 * toolbar i paneli čitaju stanje kroz useMarketingContext() — bez prop
 * drilling-a. Server logika živi u API rutama iza ta dva hooka.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useMarketingCms, useCmsPages } from "@/hooks/useMarketingCms";
import type {
  CmsPage,
  PerformanceSeoSnapshot,
} from "@/types/marketing-landing";

type CmsApi = ReturnType<typeof useMarketingCms>;
type PagesApi = ReturnType<typeof useCmsPages>;

export type MarketingPanel = "landing" | "pages";

export interface MarketingContextValue extends CmsApi {
  // ── CMS stranice (useCmsPages, preimenovano zbog kolizije sa CmsApi) ──
  pages: PagesApi["pages"];
  pagesLoading: PagesApi["isLoading"];
  createPage: PagesApi["createPage"];
  updatePage: PagesApi["updatePage"];
  deletePage: PagesApi["deletePage"];
  seedDefaults: PagesApi["seedDefaults"];
  isMutating: PagesApi["isMutating"];
  // ── UI stanje taba ──
  openSection: string | null;
  toggle: (section: string) => void;
  activePanel: MarketingPanel;
  setActivePanel: Dispatch<SetStateAction<MarketingPanel>>;
  performance: PerformanceSeoSnapshot;
  setPerformance: Dispatch<SetStateAction<PerformanceSeoSnapshot>>;
  /** Stranica koja se uređuje u modalu; null = nova stranica. */
  modalPage: CmsPage | null;
  showPageModal: boolean;
  openPageModal: (page: CmsPage | null) => void;
  closePageModal: () => void;
}

const MarketingContext = createContext<MarketingContextValue | null>(null);

export function useMarketingContext(): MarketingContextValue {
  const ctx = useContext(MarketingContext);
  if (!ctx) {
    throw new Error(
      "useMarketingContext mora da se koristi unutar <MarketingProvider>",
    );
  }
  return ctx;
}

export function MarketingProvider({ children }: { children: ReactNode }) {
  const cms = useMarketingCms();
  const pagesApi = useCmsPages();

  const [openSection, setOpenSection] = useState<string | null>("hero");
  const [activePanel, setActivePanel] = useState<MarketingPanel>("landing");
  const [performance, setPerformance] = useState<PerformanceSeoSnapshot>({});
  const [modalPage, setModalPage] = useState<CmsPage | null>(null);
  const [showPageModal, setShowPageModal] = useState(false);

  const toggle = useCallback((section: string) => {
    setOpenSection((prev) => (prev === section ? null : section));
  }, []);

  const openPageModal = useCallback((page: CmsPage | null) => {
    setModalPage(page);
    setShowPageModal(true);
  }, []);

  const closePageModal = useCallback(() => {
    setShowPageModal(false);
  }, []);

  const value = useMemo<MarketingContextValue>(
    () => ({
      ...cms,
      pages: pagesApi.pages,
      pagesLoading: pagesApi.isLoading,
      createPage: pagesApi.createPage,
      updatePage: pagesApi.updatePage,
      deletePage: pagesApi.deletePage,
      seedDefaults: pagesApi.seedDefaults,
      isMutating: pagesApi.isMutating,
      openSection,
      toggle,
      activePanel,
      setActivePanel,
      performance,
      setPerformance,
      modalPage,
      showPageModal,
      openPageModal,
      closePageModal,
    }),
    [
      cms,
      pagesApi,
      openSection,
      toggle,
      activePanel,
      performance,
      modalPage,
      showPageModal,
      openPageModal,
      closePageModal,
    ],
  );

  return (
    <MarketingContext.Provider value={value}>
      {children}
    </MarketingContext.Provider>
  );
}
