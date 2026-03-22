// hooks/useNewsletterTemplates.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { INewsletterTemplate } from "@/types";

interface CreateTemplateData {
  name: string;
  slug: string;
  subject: string;
  htmlTemplate: string;
  variables?: Array<{
    name: string;
    label: string;
    type: string;
    defaultValue?: string;
    required?: boolean;
  }>;
  thumbnail?: string;
  isActive?: boolean;
  hasVariables: boolean;
}

interface UpdateTemplateData extends Partial<CreateTemplateData> {
  id: string;
}

export function useNewsletterTemplates() {
  const queryClient = useQueryClient();

  // Kreiranje templejta
  const createTemplate = useMutation({
    mutationFn: async (data: CreateTemplateData) => {
      const response = await api.post("/newsletter/templates/create", data);
      return response.data as INewsletterTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletterTemplates"] });
      toast.success("Templejt uspešno sačuvan!");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "Greška pri kreiranju templejta";
      toast.error(message);
    },
  });

  // Ažuriranje templejta
  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...data }: UpdateTemplateData) => {
      const response = await api.put(
        `/newsletter/templates/${id}/update`,
        data
      );
      return response.data as INewsletterTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletterTemplates"] });
      toast.success("Templejt uspešno ažuriran!");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Greška pri ažuriranju";
      toast.error(message);
    },
  });

  // Brisanje templejta
  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/newsletter/templates/${id}/delete`);
      return response.data; // obično { message: "Templejt obrisan" }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletterTemplates"] });
      toast.success("Templejt obrisan");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Greška pri brisanju";
      toast.error(message);
    },
  });

  return {
    createTemplate: createTemplate.mutate,
    isCreatingTemplate: createTemplate.isPending,
    updateTemplate: updateTemplate.mutate,
    isUpdatingTemplate: updateTemplate.isPending,
    deleteTemplate: deleteTemplate.mutate,
    isDeletingTemplate: deleteTemplate.isPending,

    // Dodatno – ako koristiš mutateAsync negde
    createTemplateAsync: createTemplate.mutateAsync,
    updateTemplateAsync: updateTemplate.mutateAsync,
    deleteTemplateAsync: deleteTemplate.mutateAsync,
  };
}
