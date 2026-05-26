// hooks/useNewsletterAdmin.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CampaignCreateData,
  INewsletterCampaign,
  INewsletterTemplate,
} from "@/types";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { AxiosError } from "axios";

function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const data = error.response?.data as
      | { error?: string; upgrade?: string }
      | undefined;
    return data?.upgrade || data?.error || fallback;
  }

  return error instanceof Error ? error.message : fallback;
}

export function useNewsletterAdmin() {
  const queryClient = useQueryClient();

  const templatesQuery = useQuery<INewsletterTemplate[]>({
    queryKey: ["newsletterTemplates"],
    queryFn: async () => {
      const res = await api.get<INewsletterTemplate[]>("/newsletter/templates");
      if (!res) throw new Error("Failed to load templates");
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const campaignsQuery = useQuery<INewsletterCampaign[]>({
    queryKey: ["newsletterCampaigns"],
    queryFn: async () => {
      const res = await api.get("/newsletter/campaigns");
      if (!res) throw new Error("Failed to load campaigns");
      return res.data;
    },
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });

  const createCampaign = useMutation({
    mutationFn: async (data: CampaignCreateData) => {
      const res = await api.post("/newsletter/campaigns/create", data);
      if (!res) {
        throw new Error("Failed to create campaign");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletterCampaigns"] });
      toast.success("Kampanja uspešno kreirana!");
    },
    onError: (err: unknown) =>
      toast.error(getApiErrorMessage(err, "Greška pri kreiranju kampanje")),
  });

  const sendCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await api.post(`/newsletter/campaigns/${campaignId}/send`, {
        action: "send",
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletterCampaigns"] });
      toast.success("Kampanja pokrenuta! Slanje u toku...");
    },
    onError: (err: unknown) =>
      toast.error(getApiErrorMessage(err, "Greška pri slanju kampanje")),
  });

  const pauseCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await api.post(`/newsletter/campaigns/${campaignId}/send`, {
        action: "pause",
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletterCampaigns"] });
      toast.success("Kampanja pauzirana");
    },
    onError: (err: unknown) =>
      toast.error(getApiErrorMessage(err, "Greška pri pauziranju kampanje")),
  });

  const resumeCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await api.post(`/newsletter/campaigns/${campaignId}/send`, {
        action: "resume",
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletterCampaigns"] });
      toast.success("Kampanja nastavljena");
    },
    onError: (err: unknown) =>
      toast.error(getApiErrorMessage(err, "Greška pri nastavljanju kampanje")),
  });

  const stopCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await api.post(`/newsletter/campaigns/${campaignId}/send`, {
        action: "stop",
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletterCampaigns"] });
      toast.success("Kampanja zaustavljena");
    },
    onError: (err: unknown) =>
      toast.error(getApiErrorMessage(err, "Greška pri zaustavljanju kampanje")),
  });

  const deleteCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await api.delete(
        `/newsletter/campaigns/${campaignId}/delete`
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletterCampaigns"] });
      toast.success("Kampanja obrisana");
    },
    onError: (err: unknown) =>
      toast.error(getApiErrorMessage(err, "Greška pri brisanju kampanje")),
  });

  return {
    templates: templatesQuery.data ?? [],
    campaigns: campaignsQuery.data ?? [],
    isLoading: templatesQuery.isLoading || campaignsQuery.isLoading,
    createCampaign: createCampaign.mutateAsync,
    isCreating: createCampaign.isPending,
    sendCampaign: sendCampaign.mutate,
    stopCampaign: stopCampaign.mutate,
    resumeCampaign: resumeCampaign.mutate,
    pauseCampaign: pauseCampaign.mutate,
    deleteCampaign: deleteCampaign.mutate,
    isPausing: pauseCampaign.isPending,
    isResuming: resumeCampaign.isPending,
    isStopping: stopCampaign.isPending,
    isSending: sendCampaign.isPending,
    isDeleting: deleteCampaign.isPending,
    isError: templatesQuery.isError || campaignsQuery.isError,
  };
}
