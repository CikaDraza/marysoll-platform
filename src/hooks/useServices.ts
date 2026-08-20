import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/lib/api";
import { IService } from "@/types";
import { useTenant } from "@/contexts/TenantContext";

interface UseServicesOptions {
  query?: string;
  token?: string;
}

export function useServices({ query = "", token }: UseServicesOptions = {}) {
  const { tenantSlug } = useTenant();

  const adminQuery = useQuery<IService[]>({
    queryKey: ["services", "admin", query],
    queryFn: async () => {
      const url = query
        ? `/api/services?query=${encodeURIComponent(query)}`
        : "/api/services";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Greška pri učitavanju usluga.");
      return res.json();
    },
    enabled: !!token,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });

  const publicQuery = useQuery<IService[]>({
    queryKey: ["services", tenantSlug, query],
    queryFn: async () => {
      const { data } = await publicApi.get(`/public/${tenantSlug}/services`);
      return data;
    },
    enabled: !token && !!tenantSlug,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });

  return token ? adminQuery : publicQuery;
}
