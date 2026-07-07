"use client";

import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DIAG_NULL_LABEL } from "@/types/diagnostics";
import type {
  DiagLabelSummary,
  DiagLabelsResponse,
  DiagReportDTO,
  DiagReportsResponse,
} from "@/types/diagnostics";

/**
 * Podaci za superadmin Dijagnostika tab: sažetak oznaka (za select) + reportovi
 * izabrane oznake. Server logika je u /api/superadmin/diag-reports; dohvat ide
 * kroz react-query (konvencija ostalih superadmin hookova — jedan izvor istine,
 * bez ručnih efekata). Reportovi se učitavaju tek kad je oznaka izabrana.
 */
export function useSuperAdminDiagnostics() {
  const [selectedValue, setSelectedValue] = useState(""); // "" = ništa, DIAG_NULL_LABEL = bez oznake

  const labelsQuery = useQuery({
    queryKey: ["diag-labels"],
    queryFn: async (): Promise<DiagLabelSummary[]> => {
      const res = await fetch("/api/superadmin/diag-reports");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as DiagLabelsResponse;
      return data.labels ?? [];
    },
  });

  const reportsQuery = useQuery({
    queryKey: ["diag-reports", selectedValue],
    enabled: selectedValue !== "",
    queryFn: async (): Promise<DiagReportDTO[]> => {
      const res = await fetch(
        `/api/superadmin/diag-reports?label=${encodeURIComponent(selectedValue)}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as DiagReportsResponse;
      return data.reports ?? [];
    },
  });

  const selectLabel = useCallback((value: string) => {
    setSelectedValue(value);
  }, []);

  const refresh = useCallback(() => {
    void labelsQuery.refetch();
    if (selectedValue !== "") void reportsQuery.refetch();
  }, [labelsQuery, reportsQuery, selectedValue]);

  /** Ljudski čitljiva oznaka za prikaz/izvoz (null → "(bez oznake)"). */
  const selectedLabelText =
    selectedValue === DIAG_NULL_LABEL
      ? "(bez oznake)"
      : selectedValue || null;

  return {
    labels: labelsQuery.data ?? [],
    selectedValue,
    selectedLabelText,
    selectLabel,
    reports: reportsQuery.data ?? [],
    loadingLabels: labelsQuery.isLoading,
    loadingReports: reportsQuery.isFetching && selectedValue !== "",
    error:
      labelsQuery.isError || reportsQuery.isError
        ? "Učitavanje dijagnostike nije uspelo."
        : null,
    refresh,
  };
}
