import { z } from "zod";

export const appointmentStatsQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(1).max(9999),
});

const salonUsageGrowthSchema = z.object({
  openingAt: z.iso.datetime(),
  closingAt: z.iso.datetime(),
  /** true kada je početna tačka snimak s kraja prethodnog meseca. */
  openingFromPreviousMonth: z.boolean(),
  closingMongoMb: z.number().finite().nonnegative(),
  closingCloudinaryMb: z.number().finite().nonnegative(),
  closingActiveStaffCount: z.number().int().nonnegative(),
  /** null dok za mesec postoji samo jedan snimak. Može biti negativan. */
  mongoDeltaMb: z.number().finite().nullable(),
  cloudinaryDeltaMb: z.number().finite().nullable(),
});

const count = z.number().int().nonnegative();

const salonMonthStatsSchema = z.object({
  tenantId: z.string(),
  salonName: z.string(),
  slug: z.string(),
  /** Business volume: termini čiji je datum održavanja u mesecu. */
  appointmentsScheduled: count,
  /** Platform workload: termini kreirani (upisani) u mesecu. */
  appointmentsCreated: count,
  /** Obavljen posao: termini čiji je completedAt u mesecu. */
  appointmentsCompleted: count,
  clientsBooked: count,
  clientsApproved: count,
  nova: count,
  cekaNaOdobrenje: count,
  zavrsena: count,
  otkazana: count,
  nijeSePojavilo: count,
  /** Trenutno aktivni OWNER/ADMIN/STAFF nalozi (ne istorijska vrednost). */
  activeStaffCount: count,
  usageGrowth: salonUsageGrowthSchema.nullable(),
});

export const appointmentStatsResponseSchema = z.object({
  stats: z.array(salonMonthStatsSchema),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(1).max(9999),
});

export type SalonUsageGrowth = z.infer<typeof salonUsageGrowthSchema>;
export type SalonMonthStats = z.infer<typeof salonMonthStatsSchema>;
export type AppointmentStatsResponse = z.infer<
  typeof appointmentStatsResponseSchema
>;
