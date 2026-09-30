import { z } from "zod";

export const appointmentStatsQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(1).max(9999),
});

const salonMonthStatsSchema = z.object({
  tenantId: z.string(),
  salonName: z.string(),
  slug: z.string(),
  total: z.number().int().nonnegative(),
  clientsBooked: z.number().int().nonnegative(),
  clientsApproved: z.number().int().nonnegative(),
  nova: z.number().int().nonnegative(),
  cekaNaOdobrenje: z.number().int().nonnegative(),
  zavrsena: z.number().int().nonnegative(),
  otkazana: z.number().int().nonnegative(),
  nijeSePojavilo: z.number().int().nonnegative(),
});

export const appointmentStatsResponseSchema = z.object({
  stats: z.array(salonMonthStatsSchema),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(1).max(9999),
});

export type SalonMonthStats = z.infer<typeof salonMonthStatsSchema>;
export type AppointmentStatsResponse = z.infer<typeof appointmentStatsResponseSchema>;
