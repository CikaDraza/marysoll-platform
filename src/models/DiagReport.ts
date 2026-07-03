import { Schema, model, models } from "mongoose";

/**
 * Rezultat samouslužne mrežne dijagnostike sa /dijagnostika stranice.
 * Čuva per-host reachability testove sa korisnikovog uređaja + IP/UA metapodatke
 * (tačno ono što treba za support slučajeve tipa "meni ne radi a svima radi").
 * TTL 30 dana — dijagnostika je prolazna, ne gomilamo.
 */
const DiagReportSchema = new Schema({
  /** Slobodna oznaka iz ?u= parametra linka (npr. ime korisnice) */
  label: { type: String, default: null },
  userAgent: { type: String, default: null },
  /** Javna IP sa koje je stigao report (x-forwarded-for) */
  ip: { type: String, default: null },
  country: { type: String, default: null },
  /** Host sa kog je stranica učitana */
  pageHost: { type: String, default: null },
  /** Rezultati probe-ova po hostu: { host, status, ms, error } */
  results: { type: Schema.Types.Mixed, default: null },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 },
});

export const DiagReport =
  models.DiagReport || model("DiagReport", DiagReportSchema);
