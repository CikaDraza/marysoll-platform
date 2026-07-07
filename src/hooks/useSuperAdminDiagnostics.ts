"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  DIAG_NULL_LABEL,
  diagLabelsResponseSchema,
  diagReportsResponseSchema,
} from "@/types/diagnostics";
import type { DiagLabelSummary, DiagReportDTO } from "@/types/diagnostics";

/**
 * Podaci za superadmin Dijagnostika tab: sažetak oznaka (za select) + reportovi
 * izabrane oznake. Server logika je u /api/superadmin/diag-reports; dohvat ide
 * kroz react-query (konvencija ostalih superadmin hookova — jedan izvor istine,
 * bez ručnih efekata za stanje). Odgovori se validiraju Zod šemama (pravilo 2.2),
 * greške se javljaju preko react-hot-toast (pravilo 5.2). Reportovi se učitavaju
 * tek kad je oznaka izabrana.
 */
export function useSuperAdminDiagnostics() {
  const [selectedValue, setSelectedValue] = useState(""); // "" = ništa, DIAG_NULL_LABEL = bez oznake

  const labelsQuery = useQuery({
    queryKey: ["diag-labels"],
    queryFn: async (): Promise<DiagLabelSummary[]> => {
      const res = await fetch("/api/superadmin/diag-reports");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = diagLabelsResponseSchema.parse(await res.json());
      return data.labels;
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
      const data = diagReportsResponseSchema.parse(await res.json());
      return data.reports;
    },
  });

  // Greške → toast (external system sync; ref sprečava dupli toast na refetch).
  const toastedRef = useRef(false);
  const hasError = labelsQuery.isError || reportsQuery.isError;
  useEffect(() => {
    if (hasError && !toastedRef.current) {
      toastedRef.current = true;
      toast.error("Učitavanje dijagnostike nije uspelo.");
    } else if (!hasError) {
      toastedRef.current = false;
    }
  }, [hasError]);

  const selectLabel = useCallback((value: string) => {
    setSelectedValue(value);
  }, []);

  const refresh = useCallback(() => {
    void labelsQuery.refetch();
    if (selectedValue !== "") void reportsQuery.refetch();
  }, [labelsQuery, reportsQuery, selectedValue]);

  /** Ljudski čitljiva oznaka za prikaz/izvoz (null → "(bez oznake)"). */
  const selectedLabelText =
    selectedValue === DIAG_NULL_LABEL ? "(bez oznake)" : selectedValue || null;

  return {
    labels: labelsQuery.data ?? [],
    selectedValue,
    selectedLabelText,
    selectLabel,
    reports: reportsQuery.data ?? [],
    loadingLabels: labelsQuery.isLoading,
    loadingReports: reportsQuery.isFetching && selectedValue !== "",
    error: hasError ? "Učitavanje dijagnostike nije uspelo." : null,
    refresh,
  };
}
