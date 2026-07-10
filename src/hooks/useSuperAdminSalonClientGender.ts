"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import type { ClientGender } from "@/types";

export type SuperAdminSalonClientGender = {
  tenantId: string;
  name: string;
  clientGender: ClientGender;
};

type GenderResponse = {
  success: boolean;
  data: SuperAdminSalonClientGender;
  message?: string;
};

async function readErrorMessage(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    error?: unknown;
  } | null;
  return typeof body?.error === "string" ? body.error : "Greška pri čuvanju.";
}

export function useSuperAdminSalonClientGender(tenantId: string) {
  const { token } = useAuth();
  const qc = useQueryClient();

  const queryKey = useMemo(
    () => ["superadmin-salon-client-gender", tenantId],
    [tenantId],
  );

  const query = useQuery<SuperAdminSalonClientGender>({
    queryKey,
    enabled: Boolean(token && tenantId),
    queryFn: async () => {
      const res = await fetch(
        `/api/superadmin/tenants/${tenantId}/client-gender`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error(await readErrorMessage(res));
      const json = (await res.json()) as GenderResponse;
      return json.data;
    },
  });

  const mutation = useMutation<GenderResponse, Error, ClientGender>({
    mutationFn: async (clientGender) => {
      const res = await fetch(
        `/api/superadmin/tenants/${tenantId}/client-gender`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ clientGender }),
        },
      );
      if (!res.ok) throw new Error(await readErrorMessage(res));
      return (await res.json()) as GenderResponse;
    },
    onSuccess: (response) => {
      qc.setQueryData(queryKey, response.data);
      toast.success(response.message ?? "Sačuvano.");
    },
    onError: (error) => toast.error(error.message),
  });

  const isFemale = query.data?.clientGender === "female";

  return {
    isLoading: query.isLoading,
    isError: query.isError,
    isFemale,
    isSaving: mutation.isPending,
    toggleFemale: () => mutation.mutate(isFemale ? "neutral" : "female"),
  };
}
