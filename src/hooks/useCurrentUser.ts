import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { IUser } from "@/types";

export function useCurrentUser() {
  return useQuery<IUser>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data } = await api.get("/users/me");
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minuta
  });
}
