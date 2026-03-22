import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getUserFromToken } from "@/lib/auth/auth-client";

export function useUnreadTestimonialsCount() {
  const user = getUserFromToken();

  return useQuery({
    queryKey: ["unreadTestimonialsCount"],
    queryFn: async () => {
      const { data } = await api.get("/testimonials/unread/count");
      return data.unreadCount;
    },
    enabled: !!user?.isAdmin, // Only fetch if user is admin
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
