import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { SeoData } from "@/types";

type ApiResponse = {
  success: boolean;
  data: SeoData;
};

// =============== UPDATE SEO ===============
export function useUpdateSalonSeo() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse, Error, Partial<SeoData>>({
    mutationFn: async (data) => {
      const response = await api.put<ApiResponse>(
        "/salon-profile/update-seo",
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salonProfile"] });
      toast.success("SEO podaci uspešno sačuvani!");
    },
    onError: (error) => {
      toast.error(error.message || "Greška prilikom čuvanja SEO podataka");
    },
  });
}
