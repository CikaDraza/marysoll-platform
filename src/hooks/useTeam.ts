"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TeamInvitationResponse, TeamOverview } from "@/types/team";

const TEAM_QUERY_KEY = ["team-overview"] as const;

export function useTeamOverview(enabled: boolean) {
  return useQuery({
    queryKey: TEAM_QUERY_KEY,
    queryFn: async () => (await api.get<TeamOverview>("/team")).data,
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateTeamInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; email: string }) =>
      (await api.post<TeamInvitationResponse>("/team/invitations", input)).data,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEY }),
  });
}

export function useResendTeamInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) =>
      (
        await api.post<TeamInvitationResponse>(
          `/team/invitations/${memberId}/resend`,
        )
      ).data,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEY }),
  });
}
