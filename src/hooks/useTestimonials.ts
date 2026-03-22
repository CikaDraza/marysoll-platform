// hooks/useTestimonials.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ITestimonial } from "@/types";
import { getUserFromToken } from "@/lib/auth/auth-client";

interface UseTestimonialsProps {
  status?: string;
  enabled?: boolean;
}

export function useTestimonials({
  status = "",
  enabled = true,
}: UseTestimonialsProps = {}) {
  const user = getUserFromToken();

  return useQuery<ITestimonial[]>({
    queryKey: ["testimonials", user?.isAdmin, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append("status", status);

      const { data } = await api.get(`/testimonials?${params.toString()}`);
      return data;
    },
    enabled: !!user && enabled,
    refetchOnWindowFocus: true, // Dodato automatsko osvežavanje
    staleTime: 30000, // Podaci postaju stari nakon 30s
  });
}

// Optimistički update hook
export function useOptimisticTestimonials() {
  const queryClient = useQueryClient();

  const addTestimonial = (newTestimonial: ITestimonial) => {
    queryClient.setQueryData<ITestimonial[]>(["testimonials"], (old = []) => [
      ...old,
      newTestimonial,
    ]);

    queryClient.setQueryData<ITestimonial[]>(
      ["clientTestimonials"],
      (old = []) => [...old, newTestimonial]
    );
  };

  const updateTestimonial = (updatedTestimonial: ITestimonial) => {
    queryClient.setQueryData<ITestimonial[]>(["testimonials"], (old = []) =>
      old.map((t) =>
        t._id === updatedTestimonial._id ? updatedTestimonial : t
      )
    );

    queryClient.setQueryData<ITestimonial[]>(
      ["clientTestimonials"],
      (old = []) =>
        old.map((t) =>
          t._id === updatedTestimonial._id ? updatedTestimonial : t
        )
    );
  };

  return { addTestimonial, updateTestimonial };
}
