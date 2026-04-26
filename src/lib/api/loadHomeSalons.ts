// src/lib/api/loadHomeSalons.ts
// Server-side data loader for homepage salon showcase
import { getSalonProfiles, getSalonServices, getAvailableSlots } from "@/lib/api/platformClient";
import { mapSalon, mapService, mapSlot, type MappedSalon, type MappedSlot } from "@/lib/mappers/salonMapper";
import { getDistanceKm } from "@/lib/utils/distance";

export interface HomeSalonEntry {
  salon: MappedSalon;
  services: ReturnType<typeof mapService>[];
  slots: MappedSlot[];
}

export async function loadHomeSalons(city: string, lat?: number, lng?: number): Promise<HomeSalonEntry[]> {
  const today = new Date().toISOString().slice(0, 10);

  let rawSalons = await getSalonProfiles({ city, lat, lng }).catch(() => []);
  rawSalons = rawSalons.slice(0, 2);

  const entries = await Promise.all(
    rawSalons.map(async (raw) => {
      const salon = mapSalon(raw);

      const [rawServices, rawSlots] = await Promise.all([
        getSalonServices(salon.id).catch(() => []),
        getAvailableSlots({ salonId: salon.id, date: today }).catch(() => []),
      ]);

      salon.services = rawServices.map(mapService);

      if (lat != null && lng != null && salon.location.lat != null && salon.location.lng != null) {
        salon.distance = parseFloat(
          getDistanceKm(lat, lng, salon.location.lat, salon.location.lng).toFixed(1),
        );
      }

      const slots = rawSlots
        .map(mapSlot)
        .filter((s) => s.isAvailable)
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .slice(0, 3);

      return {
        salon,
        services: salon.services.slice(0, 3),
        slots,
      };
    }),
  );

  if (lat != null && lng != null) {
    entries.sort((a, b) => (a.salon.distance ?? 999) - (b.salon.distance ?? 999));
  }

  return entries;
}
