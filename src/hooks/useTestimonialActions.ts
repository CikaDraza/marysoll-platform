// hooks/useTestimonialActions.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CreateTestimonialData, UpdateTestimonialData } from "@/types";
import toast from "react-hot-toast";

export function useTestimonialActions() {
  const queryClient = useQueryClient();

  const createTestimonial = useMutation({
    mutationFn: async (testimonialData: CreateTestimonialData) => {
      const { data } = await api.post("/testimonials/create", testimonialData);
      return data;
    },
    onSuccess: () => {
      // Invalidiramo sve testimonials upite i appointments
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["client-testimonials"] });
      toast.success("Preporuka uspešno poslata.");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : String(err));
      throw err;
    },
  });

  const updateTestimonial = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateTestimonialData;
    }) => {
      const { data: response } = await api.put(
        `/testimonials/update/${id}`,
        data
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      toast.success("Preporuka uspešno ažurirana.");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : String(err));
      throw err;
    },
  });

  const deleteTestimonial = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/testimonials/delete/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      toast.success("Preporuka uspešno izbrisana.");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : String(err));
      throw err;
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.put(`/testimonials/mark-read/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["unreadTestimonialsCount"] });
      toast.success("Preporuka označena kao pročitana.");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : String(err));
      throw err;
    },
  });

  const markClientAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.put(`/testimonials/mark-client-read/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-testimonials"] });
      queryClient.invalidateQueries({
        queryKey: ["unreadTestimonialsCount"],
      });
      toast.success("Preporuka označena kao pročitana.");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : String(err));
      throw err;
    },
  });

  return {
    createTestimonial,
    updateTestimonial,
    deleteTestimonial,
    markAsRead,
    markClientAsRead,
  };
}
