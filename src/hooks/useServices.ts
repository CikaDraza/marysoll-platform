import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { publicApi } from "@/lib/api";
import { IService } from "@/types";
import { useParams } from "next/navigation";

interface UseServicesOptions {
  query?: string;
}

export function useServices({ query = "" }: UseServicesOptions = {}) {
  const params = useParams();
  const tenantSlug = params?.tenantSlug as string;

  return useQuery<IService[]>({
    queryKey: ["services", tenantSlug, query],
    queryFn: async () => {
      if (!tenantSlug) {
        throw new Error("Tenant slug is required");
      }

      const { data } = await publicApi.get(`/public/${tenantSlug}/services`);
      return data;
    },
    enabled: !!tenantSlug,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });
}

async function saveService(data: IService): Promise<IService> {
  if (data._id) {
    const res = await fetch(`/api/services/${data._id}/update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Greška pri ažuriranju usluge");
    return res.json();
  } else {
    const res = await fetch(`/api/services/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Greška pri kreiranju usluge");
    return res.json();
  }
}

export function useSaveService() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: saveService,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (err) => {
      console.error("Greška u čuvanju usluge:", err);
    },
  });
}
