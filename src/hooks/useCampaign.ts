import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { INewsletterCampaign as Campaign } from "@/types";

export function useCampaign(id: string, initialData?: Campaign) {
  return useQuery<Campaign>({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const res = await axios.get(`/api/landing-campaigns/${id}`);
      return res.data;
    },
    enabled: !!id,
    initialData,
    staleTime: 1000 * 60 * 5,
  });
}
