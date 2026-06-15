import { useQuery } from "@tanstack/react-query";
import { CloudinaryVideoListResponse } from "@/types/cloudinary";

async function fetchVideos(
  token: string | null,
): Promise<CloudinaryVideoListResponse> {
  const res = await fetch("/api/cloudinary/videos", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    throw new Error("Failed to load videos");
  }

  return res.json();
}

export function useCloudinaryVideos(token: string | null = null) {
  return useQuery({
    queryKey: ["cloudinary-videos", token],
    queryFn: () => fetchVideos(token),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    enabled: !!token,
  });
}
