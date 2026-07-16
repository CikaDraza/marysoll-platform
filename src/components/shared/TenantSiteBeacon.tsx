"use client";

/**
 * Daljinska "crna kutija" za javni sajt salona (/tenant/*) — dijagnoza
 * crash-eva kod korisnika kojima ne vidimo konzolu (support slučaj: "učita se
 * samo roze pozadina, ništa drugo" — SSR ljuska teme stigne do uređaja, ali
 * klijentski JS pukne pa se sadržaj nikad ne pojavi).
 *
 * Za razliku od DashboardBeacon-a NAMERNO nema isPlatformHost guard: saloni
 * rade i na custom domenima (npr. lashroom-byanja.com), a reporter mora da radi
 * i tamo. Do tenant/layout-a (gde se ova komponenta montira) dolaze isključivo
 * pravi tenant zahtevi — proxy ubacuje x-tenant-slug, inače je notFound() — pa
 * je svaki host koji ovde stigne po definiciji legitiman tenant sajt.
 *
 * Scope "site" → istorijske oznake site-boot / site-error / site-alive u
 * DiagReport. Čitanje (superadmin → /api/superadmin/diag-reports):
 *   site-boot bez site-alive = JS umro u <5s; site-error = imamo stack sa
 *   uređaja; ništa (a stranica se videla) = chunkovi se na tom uređaju uopšte
 *   ne izvršavaju (verzija/sintaksa browsera).
 */

import { useEffect } from "react";
import { attachCrashReporter } from "@/lib/platform/diagnostic-client";

export function TenantSiteBeacon() {
  useEffect(() => attachCrashReporter("site"), []);

  return null;
}
