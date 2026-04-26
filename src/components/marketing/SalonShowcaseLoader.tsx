// src/components/marketing/SalonShowcaseLoader.tsx
// Server component — fetches data then hands off to client SalonShowcase

import { headers } from "next/headers";
import { getCityFromHeaders } from "@/lib/geo/getCity";
import { loadHomeSalons } from "@/lib/api/loadHomeSalons";
import { SalonShowcase } from "./SalonShowcase";

export async function SalonShowcaseLoader() {
  const h = await headers();
  const { city, lat, lng } = getCityFromHeaders(h);

  const entries = await loadHomeSalons(city, lat, lng).catch(() => []);

  return <SalonShowcase entries={entries} />;
}
