import { useQuery } from "@tanstack/react-query";
import { CloudinaryListResponse } from "@/types/cloudinary";

async function fetchImages(): Promise<CloudinaryListResponse> {
  const res = await fetch("/api/cloudinary/images");

  if (!res.ok) {
    throw new Error("Failed to load images");
  }

  return res.json();
}

export function useCloudinaryImages() {
  return useQuery({
    queryKey: ["cloudinary-images"],
    queryFn: fetchImages,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}
