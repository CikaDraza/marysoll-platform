export type GeoCoordinateValue = number | null;

export type GeoCoordinates = {
  lat: GeoCoordinateValue;
  lng: GeoCoordinateValue;
};

export type GeoValidationResult =
  | { valid: true; coordinates: GeoCoordinates }
  | { valid: false; error: string };

function isCoordinateNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function validateGeoCoordinates(
  lat: unknown,
  lng: unknown,
): GeoValidationResult {
  const latMissing = lat === null || lat === undefined;
  const lngMissing = lng === null || lng === undefined;

  if (latMissing && lngMissing) {
    return { valid: true, coordinates: { lat: null, lng: null } };
  }

  if (latMissing || lngMissing) {
    return {
      valid: false,
      error: "Latitude i longitude moraju biti uneti zajedno.",
    };
  }

  if (!isCoordinateNumber(lat) || !isCoordinateNumber(lng)) {
    return {
      valid: false,
      error: "Latitude i longitude moraju biti decimalni brojevi.",
    };
  }

  if (lat < -90 || lat > 90) {
    return {
      valid: false,
      error: "Latitude mora biti između -90 i 90.",
    };
  }

  if (lng < -180 || lng > 180) {
    return {
      valid: false,
      error: "Longitude mora biti između -180 i 180.",
    };
  }

  return { valid: true, coordinates: { lat, lng } };
}
