"use client";

import { useCallback, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  integrityReportResponseSchema,
  integrityTenantsResponseSchema,
} from "@/types/diagnostics";
import type {
  IntegrityReportDTO,
  IntegrityTenantOption,
} from "@/types/diagnostics";

/**
 * Identity & Loyalty Health sekcija Dijagnostika taba: lista salona (select)
 * + on-demand pokretanje provera. Run je useMutation (eksplicitna akcija na
 * dugme — provere su read-only ali skupe, ne smeju da se okidaju pasivno).
 * Odgovori se validiraju Zod šemama (pravilo 2.2), greške idu na toast (5.2).
 */
export function useSuperAdminIntegrity() {
  const [tenantId, setTenantId] = useState("");

  const tenantsQuery = useQuery({
    queryKey: ["integrity-tenants"],
    queryFn: async (): Promise<IntegrityTenantOption[]> => {
      const res = await fetch("/api/superadmin/diagnostics/integrity");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = integrityTenantsResponseSchema.parse(await res.json());
      return data.tenants;
    },
  });

  const runMutation = useMutation({
    mutationFn: async (id: string): Promise<IntegrityReportDTO> => {
      const res = await fetch(
        `/api/superadmin/diagnostics/integrity?tenantId=${encodeURIComponent(id)}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = integrityReportResponseSchema.parse(await res.json());
      return data.report;
    },
    onError: () => {
      toast.error("Pokretanje provera nije uspelo.");
    },
  });

  const selectTenant = useCallback((id: string) => {
    setTenantId(id);
  }, []);

  const run = useCallback(() => {
    if (!tenantId) {
      toast.error("Prvo izaberite salon.");
      return;
    }
    runMutation.mutate(tenantId);
  }, [tenantId, runMutation]);

  return {
    tenants: tenantsQuery.data ?? [],
    loadingTenants: tenantsQuery.isLoading,
    tenantsError: tenantsQuery.isError,
    tenantId,
    selectTenant,
    run,
    running: runMutation.isPending,
    report: runMutation.data ?? null,
  };
}
