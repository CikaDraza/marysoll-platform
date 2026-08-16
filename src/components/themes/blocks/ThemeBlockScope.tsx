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

export interface ThemeBlockScopeValue {
  theme: string;
  data: ResolvedBlockMap;
  renderers: ThemeBlockRenderers;
  onSkip?: (event: BlockSkipEvent) => void;
}

const ThemeBlockContext = createContext<ThemeBlockScopeValue | null>(null);

export function ThemeBlockScope({
  children,
  theme,
  data,
  renderers,
  onSkip,
}: ThemeBlockScopeValue & { children: ReactNode }) {
  const value = useMemo(
    () => ({ theme, data, renderers, onSkip }),
    [theme, data, renderers, onSkip],
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
