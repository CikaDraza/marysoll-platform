/**
 * Kontrakt superadmin Dijagnostika taba (čitanje DiagReport kolekcije).
 * Tipovi su INFERISANI iz Zod šema (jedan izvor istine — pravilo 2.2): iste
 * šeme validiraju query param i izlazni payload u API ruti, i JSON u hooku.
 * Oblik `results` prati ModuleResult iz @panta/diagnostic-engine; stari reporti
 * (pre paketa) imaju kompatibilan podskup polja (višak polja Zod odbacuje).
 */
import { z } from "zod";

/** Sentinel za reportove bez oznake (label === null) u select value / query param. */
export const DIAG_NULL_LABEL = "__NULL__";

export const diagModuleStateSchema = z.enum([
  "pending",
  "ok",
  "warn",
  "fail",
  "info",
]);

export const diagModuleResultSchema = z.object({
  key: z.string(),
  name: z.string(),
  state: diagModuleStateSchema,
  ms: z.number().nullable(),
  detail: z.string().nullable(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export const diagLabelSummarySchema = z.object({
  /** null = reportovi bez ?u= oznake */
  label: z.string().nullable(),
  count: z.number(),
  /** ISO timestamp poslednjeg reporta za ovu oznaku */
  lastAt: z.string(),
});

export const diagReportSchema = z.object({
  _id: z.string(),
  label: z.string().nullable(),
  userAgent: z.string().nullable(),
  ip: z.string().nullable(),
  country: z.string().nullable(),
  pageHost: z.string().nullable(),
  results: z.array(diagModuleResultSchema).nullable(),
  createdAt: z.string(),
});

export const diagLabelsResponseSchema = z.object({
  labels: z.array(diagLabelSummarySchema),
});
export const diagReportsResponseSchema = z.object({
  reports: z.array(diagReportSchema),
});

/** Query param za GET /api/superadmin/diag-reports (label opciono, cap dužine). */
export const diagQuerySchema = z.object({
  label: z.string().max(200).nullable(),
});

export type DiagModuleState = z.infer<typeof diagModuleStateSchema>;
export type DiagModuleResult = z.infer<typeof diagModuleResultSchema>;
export type DiagLabelSummary = z.infer<typeof diagLabelSummarySchema>;
export type DiagReportDTO = z.infer<typeof diagReportSchema>;
export type DiagLabelsResponse = z.infer<typeof diagLabelsResponseSchema>;
export type DiagReportsResponse = z.infer<typeof diagReportsResponseSchema>;
