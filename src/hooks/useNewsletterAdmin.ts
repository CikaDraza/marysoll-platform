// hooks/useNewsletterAdmin.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CampaignCreateData,
  INewsletterCampaign,
  INewsletterTemplate,
} from "@/types";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

export function useNewsletterAdmin() {
  const queryClient = useQueryClient();

  const templatesQuery = useQuery<INewsletterTemplate[]>({
    queryKey: ["newsletterTemplates"],
    queryFn: async () => {
      const res = await api.get<INewsletterTemplate[]>("/newsletter/templates");
      if (!res) throw new Error("Failed to load templates");
      return res.data;
    },
  });

  const campaignsQuery = useQuery<INewsletterCampaign[]>({
    queryKey: ["newsletterCampaigns"],
    queryFn: async () => {
      const res = await api.get("/newsletter/campaigns");
      if (!res) throw new Error("Failed to load campaigns");
      return res.data;
    },
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
    onError: (err: Error) => toast.error(err.message),
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
    onError: (err: Error) => toast.error(err.message),
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
    onError: (err: Error) => toast.error(err.message),
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
    onError: (err: Error) => toast.error(err.message),
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
    onError: (err: Error) => toast.error(err.message),
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
    onError: (err: Error) => toast.error(err.message),
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
