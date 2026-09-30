"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiErrorResponseSchema,
  platformUsageResponseSchema,
  type PlatformUsageResponse,
} from "@/types/platform-usage";

async function readJsonError(
  response: Response,
  fallback: string,
): Promise<Error> {
  const result = apiErrorResponseSchema.safeParse(
    await response.json().catch(() => null),
  );
  return new Error(result.success ? result.data.error : fallback);
}

async function parsePlatformUsageResponse(
  response: Response,
): Promise<PlatformUsageResponse> {
  return platformUsageResponseSchema.parse(await response.json());
}

async function fetchPlatformUsage(): Promise<PlatformUsageResponse> {
  const response = await fetch("/api/superadmin/platform-usage");
  if (!response.ok) {
    throw await readJsonError(response, "Potrošnja platforme nije dostupna.");
  }
  return parsePlatformUsageResponse(response);
}

async function mutatePlatformUsage(
  path: "refresh" | "calibrate",
): Promise<PlatformUsageResponse> {
  const response = await fetch(`/api/superadmin/platform-usage/${path}`, {
    method: "POST",
  });
  if (!response.ok) {
    throw await readJsonError(
      response,
      path === "refresh"
        ? "Potrošnja nije osvežena."
        : "Kalibracija nije sačuvana.",
    );
  }
  return parsePlatformUsageResponse(response);
}

export function usePlatformUsage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["platform-usage"],
    queryFn: fetchPlatformUsage,
    staleTime: 60_000,
  });
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["platform-usage"] });
  const refresh = useMutation({
    mutationFn: () => mutatePlatformUsage("refresh"),
    onSuccess: invalidate,
  });
  const calibrate = useMutation({
    mutationFn: () => mutatePlatformUsage("calibrate"),
    onSuccess: invalidate,
  });

  return { ...query, refresh, calibrate };
}
