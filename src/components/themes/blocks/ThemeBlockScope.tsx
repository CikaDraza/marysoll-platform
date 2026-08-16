"use client";
/**
 * ThemeBlockScope — vezivanje renderera i podataka za jednu temu.
 *
 * ZAŠTO scope, a ne renderer u registry-ju: osam tema ima osam prikaza istog
 * bloka (`content.hero` je Theme1Hero, Theme5Hero, Theme8Hero…). Registry drži
 * ono što je zajedničko — shemu, loader, capability — a prikaz ostaje vlasništvo
 * teme. Zato tema jednom prijavi svoje renderere, pa `<ThemeBlock>` niže u
 * stablu ostaje kratak.
 *
 * `data` dolazi iz server prolaza (`resolveBlockData`) i prosleđuje se kroz
 * server komponentu — blokovi ne fetch-uju sa klijenta (spec 5.2).
 *
 * NAPOMENA O BUNDLE-u: ovaj sloj uvozi SAMO uske putanje iz `lib/platform/blocks`
 * (types, legacy-always). Barrel `@/lib/platform/blocks` povlači definicije i
 * loadere (zod, server) i ostaje server-side.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type {
  BlockSkipEvent,
  ResolvedBlockMap,
} from "@/lib/platform/blocks/render-types";
import type { ThemeBlockRenderers } from "./renderers";

/**
 * Rutiranje NIJE podatak bloka — prefiks tenant slug-a je stvar aplikacije, ne
 * domena. Zato ne ide kroz loader nego kroz scope, a renderer ga uzima
 * `useThemeRouting()`-om samo ako mu treba.
 */
export interface ThemeRouting {
  tenantSlug?: string;
  clientSlug?: string;
  resolveHref: (href: string) => string;
}

export interface ThemeBlockScopeValue {
  theme: string;
  data: ResolvedBlockMap;
  renderers: ThemeBlockRenderers;
  routing: ThemeRouting;
  onSkip?: (event: BlockSkipEvent) => void;
}

const ThemeBlockContext = createContext<ThemeBlockScopeValue | null>(null);

export function ThemeBlockScope({
  children,
  theme,
  data,
  renderers,
  routing,
  onSkip,
}: ThemeBlockScopeValue & { children: ReactNode }) {
  const value = useMemo(
    () => ({ theme, data, renderers, routing, onSkip }),
    [theme, data, renderers, routing, onSkip],
  );
  return (
    <ThemeBlockContext.Provider value={value}>
      {children}
    </ThemeBlockContext.Provider>
  );
}

/** `null` kad tema još nije migrirana — komponente tada ne renderuju ništa. */
export function useThemeBlockScope(): ThemeBlockScopeValue | null {
  return useContext(ThemeBlockContext);
}

/** Za renderere kojima treba prefiks tenant slug-a (linkovi ka /termini, /usluge…). */
export function useThemeRouting(): ThemeRouting {
  const scope = useContext(ThemeBlockContext);
  if (!scope) {
    throw new Error("useThemeRouting je pozvan van <ThemeBlockScope>");
  }
  return scope.routing;
}

/** Prijava preskočenog bloka: nikad ne obara stranu (spec 5.1). */
export function reportSkip(
  scope: ThemeBlockScopeValue | null,
  event: BlockSkipEvent,
): void {
  if (scope?.onSkip) {
    scope.onSkip(event);
    return;
  }
  console.warn(
    `[blocks] "${event.type}" nije renderovan (${event.reason}) tema=${event.theme}` +
      `${event.detail ? ` — ${event.detail}` : ""}`,
  );
}
