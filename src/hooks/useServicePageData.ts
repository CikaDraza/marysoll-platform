// src/hooks/useServicePageData.ts
import { IService } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const fetchServices = async (): Promise<IService[]> => {
  const url = `${API_URL}/api/services`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    next: { revalidate: 600 },
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Greška pri učitavanju usluga: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  return data;
};
