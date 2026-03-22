// src/hooks/useCampaignSemantic.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { UpdateCampaignSemanticPayload } from "@/types/conversational/semantic";

interface UpdateSemanticArgs {
  campaignId: string;
  payload: UpdateCampaignSemanticPayload;
}

export function useCampaignSemantic() {
  const qc = useQueryClient();

  const updateSemantic = useMutation({
    mutationFn: async ({ campaignId, payload }: UpdateSemanticArgs) => {
      const res = await api.patch(
        `/newsletter/campaigns/${campaignId}/semantic`,
        payload
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["newsletterCampaigns"] });
      toast.success("Semantic data sačuvana");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    updateSemantic: updateSemantic.mutateAsync,
    isSaving: updateSemantic.isPending,
  };
}
