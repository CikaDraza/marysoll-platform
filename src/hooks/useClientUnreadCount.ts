import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getUserFromToken } from "@/lib/auth/auth-client";

export function useClientUnreadCount() {
  const user = getUserFromToken();

  return useQuery({
    queryKey: ["client-unread-count"],
    queryFn: async () => {
      const { data } = await api.get("/testimonials/unread/client-count");
      return data.unreadClientCount;
    },
    enabled: !!user && !user.isAdmin,
    refetchInterval: 30000,
  });
}
