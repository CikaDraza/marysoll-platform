import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/lib/api";

export function useSalonSeo() {
  return useQuery({
    queryKey: ["salonSeo"],
    queryFn: async () => {
      const { data } = await publicApi.get("/salon-profile");
      return data.data?.seo || {};
    },
    staleTime: 1000 * 60 * 10,
  });
}
