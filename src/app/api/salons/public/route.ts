// GET /api/salons/public — public salon discovery, proxies to platform API
import { NextRequest, NextResponse } from "next/server";
import { getSalonProfiles, getSalonServices } from "@/lib/api/platformClient";
import {
  mapSalon,
  mapService,
  type MappedSalon,
} from "@/lib/mappers/salonMapper";
import { getDistanceKm } from "@/lib/utils/distance";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const city = searchParams.get("city") ?? undefined;
    const lat = searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : undefined;
    const lng = searchParams.get("lng") ? parseFloat(searchParams.get("lng")!) : undefined;

    const rawSalons = await getSalonProfiles({ city, lat, lng });
    const limited = rawSalons.slice(0, 2);

    const salons: MappedSalon[] = await Promise.all(
      limited.map(async (raw) => {
        const salon = mapSalon(raw);

        const rawServices = await getSalonServices(salon.id).catch(() => []);
        salon.services = rawServices.map(mapService).slice(0, 3);

        if (lat != null && lng != null && salon.location.lat != null && salon.location.lng != null) {
          salon.distance = parseFloat(
            getDistanceKm(lat, lng, salon.location.lat, salon.location.lng).toFixed(1),
          );
        }

        return salon;
      }),
    );

    return NextResponse.json(salons);
  } catch (err) {
    console.error("[GET /api/salons/public]", err);
    return NextResponse.json({ error: "Greška pri učitavanju salona" }, { status: 500 });
  }
}
