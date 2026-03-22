// src/hooks/useAppointmentPageData.ts
import { IAppointment, SalonProfile } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const fetchAppointments = async (): Promise<IAppointment[]> => {
  const url = `${API_URL}/api/appointments/public`;

  const res = await fetch(url, {
    next: { revalidate: 300 }, // 5 minuta
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Greška pri učitavanju termina");
  }

  return res.json();
};

export const fetchSalonProfile = async (): Promise<SalonProfile> => {
  const url = `${API_URL}/api/salon-profile`;

  const res = await fetch(url, {
    next: { revalidate: 600 },
  });

  if (!res.ok) {
    throw new Error("Greška pri učitavanju podataka salona");
  }
  const json = await res.json();
  return json.data || null;
};
