"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

type BulkAction =
  | { action: "enable" | "disable"; tenantIds: string[] }
  | { action: "backfill" };

async function readErrorMessage(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    error?: unknown;
  } | null;
  return typeof body?.error === "string" ? body.error : "Greška.";
}

export function useSuperAdminMarketplaceBulk() {
  const { token } = useAuth();
  const qc = useQueryClient();

  const mutation = useMutation<
    { success: boolean; message?: string; modified?: number },
    Error,
    BulkAction
  >({
    mutationFn: async (payload) => {
      const res = await fetch("/api/superadmin/marketplace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readErrorMessage(res));
      return res.json();
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["superadmin-marketplace-list"] });
      qc.invalidateQueries({ queryKey: ["superadmin-salon-marketplace"] });
      toast.success(res.message ?? "Gotovo.");
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    enable: (tenantIds: string[]) =>
      mutation.mutate({ action: "enable", tenantIds }),
    disable: (tenantIds: string[]) =>
      mutation.mutate({ action: "disable", tenantIds }),
    backfill: () => mutation.mutate({ action: "backfill" }),
    isPending: mutation.isPending,
  };
}
