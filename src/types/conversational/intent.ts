/**
 * CampaignIntent — izdvojen u leaf fajl da semantic.ts ne importuje campaign.ts
 * (campaign.ts importuje semantic.ts, pa je enum ovde pravio kružnu zavisnost —
 * enum je runtime vrednost, ne briše se pri kompajliranju kao čisti tipovi).
 */
export enum CampaignIntent {
  Promotion = "promotion",
  Education = "education",
  Tips = "tips",
  Announcement = "announcement",
  Event = "event",
  Conversion = "conversion",
}
