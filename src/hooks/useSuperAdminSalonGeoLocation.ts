"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { validateGeoCoordinates } from "@/helpers/validateGeoCoordinates";

export type SuperAdminSalonGeoLocation = {
  _id: string;
  tenantId: string;
  name: string;
  street: string;
  city: string;
  lat: number | null;
  lng: number | null;
};

type GeoLocationResponse = {
  success: boolean;
  data: SuperAdminSalonGeoLocation;
  message?: string;
};

type SaveGeoLocationPayload = {
  lat: number | null;
  lng: number | null;
};

async function readErrorMessage(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    error?: unknown;
  } | null;

  return typeof body?.error === "string" ? body.error : "Greška pri čuvanju.";
}

function parseInputValue(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return Number(trimmed);
}

export function useSuperAdminSalonGeoLocation(tenantId: string) {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<{
    tenantId: string;
    latInput: string | null;
    lngInput: string | null;
  }>({
    tenantId,
    latInput: null,
    lngInput: null,
  });

  const queryKey = useMemo(
    () => ["superadmin-salon-geo-location", tenantId],
    [tenantId],
  );

  const geoQuery = useQuery<SuperAdminSalonGeoLocation>({
    queryKey,
    enabled: Boolean(token && tenantId),
    queryFn: async () => {
      const res = await fetch(
        `/api/superadmin/tenants/${tenantId}/geo-location`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) throw new Error(await readErrorMessage(res));

      const json = (await res.json()) as GeoLocationResponse;
      return json.data;
    },
  });

  const savedLatInput =
    typeof geoQuery.data?.lat === "number" ? String(geoQuery.data.lat) : "";
  const savedLngInput =
    typeof geoQuery.data?.lng === "number" ? String(geoQuery.data.lng) : "";
  const isCurrentDraft = draft.tenantId === tenantId;
  const latInput =
    isCurrentDraft && draft.latInput !== null ? draft.latInput : savedLatInput;
  const lngInput =
    isCurrentDraft && draft.lngInput !== null ? draft.lngInput : savedLngInput;

  const saveMutation = useMutation<
    GeoLocationResponse,
    Error,
    SaveGeoLocationPayload
  >({
    mutationFn: async (payload) => {
      const res = await fetch(
        `/api/superadmin/tenants/${tenantId}/geo-location`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) throw new Error(await readErrorMessage(res));

      return (await res.json()) as GeoLocationResponse;
    },
    onSuccess: (response) => {
      qc.setQueryData(queryKey, response.data);
      setDraft({ tenantId, latInput: null, lngInput: null });
      toast.success(response.message ?? "Geo lokacija je sačuvana.");
    },
    onError: (error) => toast.error(error.message),
  });

  const saveGeoLocation = () => {
    const lat = parseInputValue(latInput);
    const lng = parseInputValue(lngInput);
    const validation = validateGeoCoordinates(lat, lng);

    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    saveMutation.mutate(validation.coordinates);
  };

  return {
    salon: geoQuery.data,
    isLoading: geoQuery.isLoading,
    isError: geoQuery.isError,
    errorMessage:
      geoQuery.error instanceof Error
        ? geoQuery.error.message
        : "Greška pri učitavanju geo lokacije.",
    latInput,
    lngInput,
    setLatInput: (value: string) =>
      setDraft((current) => ({
        tenantId,
        latInput: value,
        lngInput:
          current.tenantId === tenantId ? current.lngInput : savedLngInput,
      })),
    setLngInput: (value: string) =>
      setDraft((current) => ({
        tenantId,
        latInput:
          current.tenantId === tenantId ? current.latInput : savedLatInput,
        lngInput: value,
      })),
    saveGeoLocation,
    isSaving: saveMutation.isPending,
  };
}
