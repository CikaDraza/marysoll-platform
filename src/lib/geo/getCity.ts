// src/lib/geo/getCity.ts

export interface CityResult {
  city: string;
  lat?: number;
  lng?: number;
}

// Server-side: reads from request headers (Next.js headers() or plain Headers object)
export function getCityFromHeaders(headers: Headers): CityResult {
  const city =
    headers.get("x-vercel-ip-city") ??
    headers.get("x-city") ??
    null;

  if (city) {
    const latHeader = headers.get("x-vercel-ip-latitude");
    const lngHeader = headers.get("x-vercel-ip-longitude");
    return {
      city: decodeURIComponent(city),
      lat: latHeader ? parseFloat(latHeader) : undefined,
      lng: lngHeader ? parseFloat(lngHeader) : undefined,
    };
  }

  return { city: "Novi Sad" };
}

// Client-side: reads from localStorage first, then falls back to "Novi Sad"
export function getCityClient(): CityResult {
  if (typeof window === "undefined") return { city: "Novi Sad" };
  const stored = localStorage.getItem("selectedCity");
  if (stored) {
    try {
      return JSON.parse(stored) as CityResult;
    } catch {
      // ignore malformed
    }
  }
  return { city: "Novi Sad" };
}

export function saveSelectedCity(result: CityResult): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("selectedCity", JSON.stringify(result));
  }
}
