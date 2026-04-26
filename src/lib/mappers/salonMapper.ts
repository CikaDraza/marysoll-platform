// src/lib/mappers/salonMapper.ts
import type {
  PlatformSalon,
  PlatformService,
  PlatformSlot,
  PlatformWorkingHours,
} from "@/lib/api/platformClient";

export interface MappedSalon {
  id: string;
  name: string;
  location: {
    lat?: number;
    lng?: number;
    city?: string;
  };
  services: MappedService[];
  workingHours: MappedWorkingHours[];
  logo?: string;
  slug?: string;
  distance?: number;
}

export interface MappedService {
  id: string;
  name: string;
  duration?: number;
  price?: number;
}

export interface MappedSlot {
  id: string;
  salonId: string;
  serviceId?: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  distance?: number;
}

export interface MappedWorkingHours {
  day: string;
  open?: string;
  close?: string;
  isOpen?: boolean;
}

export function mapSalon(raw: PlatformSalon): MappedSalon {
  return {
    id: raw.id,
    name: raw.name,
    location: {
      lat: raw.lat,
      lng: raw.lng,
      city: raw.city,
    },
    logo: raw.logo,
    slug: raw.slug,
    services: [],
    workingHours: [],
  };
}

export function mapService(raw: PlatformService): MappedService {
  return {
    id: raw.id,
    name: raw.name,
    duration: raw.duration,
    price: raw.price,
  };
}

export function mapSlot(raw: PlatformSlot): MappedSlot {
  return {
    id: raw.id,
    salonId: raw.salonId,
    serviceId: raw.serviceId,
    startTime: raw.startTime,
    endTime: raw.endTime,
    isAvailable: raw.isAvailable,
  };
}

export function mapWorkingHours(raw: PlatformWorkingHours): MappedWorkingHours {
  return {
    day: raw.day,
    open: raw.open,
    close: raw.close,
    isOpen: raw.isOpen,
  };
}
