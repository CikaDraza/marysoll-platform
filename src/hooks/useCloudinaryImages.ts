import { useQuery } from "@tanstack/react-query";
import { CloudinaryListResponse } from "@/types/cloudinary";

async function fetchImages(token: string | null): Promise<CloudinaryListResponse> {
  const res = await fetch("/api/cloudinary/images", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    throw new Error("Failed to load images");
  }

  return res.json();
}

export function useCloudinaryImages(token: string | null = null) {
  return useQuery({
    queryKey: ["cloudinary-images", token],
    queryFn: () => fetchImages(token),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    enabled: !!token,
  });
}
