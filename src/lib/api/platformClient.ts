// src/lib/api/platformClient.ts
// External Marysoll Platform API client

const BASE_URL = process.env.PLATFORM_API_URL ?? "";

export interface PlatformSalon {
  id: string;
  name: string;
  city?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  description?: string;
  logo?: string;
  slug?: string;
}

export interface PlatformService {
  id: string;
  name: string;
  duration?: number;
  price?: number;
  category?: string;
}

export interface PlatformWorkingHours {
  day: string;
  open?: string;
  close?: string;
  isOpen?: boolean;
}

export interface PlatformSlot {
  id: string;
  salonId: string;
  serviceId?: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface PlatformBookingPayload {
  salonId: string;
  serviceId: string;
  startTime: string;
  user: {
    name: string;
    phone: string;
    email?: string;
  };
}

export interface PlatformAuthPayload {
  email: string;
  password: string;
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Platform API ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

export function getSalonProfiles(params?: {
  city?: string;
  lat?: number;
  lng?: number;
}): Promise<PlatformSalon[]> {
  const qs = new URLSearchParams();
  if (params?.city) qs.set("city", params.city);
  if (params?.lat != null) qs.set("lat", String(params.lat));
  if (params?.lng != null) qs.set("lng", String(params.lng));
  const query = qs.toString() ? `?${qs}` : "";
  return request<PlatformSalon[]>(`/salons${query}`);
}

export function getSalonServices(salonId: string): Promise<PlatformService[]> {
  return request<PlatformService[]>(`/salons/${salonId}/services`);
}

export function getSalonWorkingHours(salonId: string): Promise<PlatformWorkingHours[]> {
  return request<PlatformWorkingHours[]>(`/salons/${salonId}/working-hours`);
}

export function getAvailableSlots(params: {
  salonId: string;
  serviceId?: string;
  date?: string;
}): Promise<PlatformSlot[]> {
  const qs = new URLSearchParams({ salonId: params.salonId });
  if (params.serviceId) qs.set("serviceId", params.serviceId);
  if (params.date) qs.set("date", params.date);
  return request<PlatformSlot[]>(`/slots?${qs}`);
}

export function createBooking(payload: PlatformBookingPayload): Promise<{ id: string }> {
  return request<{ id: string }>("/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function login(payload: PlatformAuthPayload): Promise<{ token: string }> {
  return request<{ token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function register(payload: PlatformAuthPayload & { name?: string }): Promise<{ token: string }> {
  return request<{ token: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
