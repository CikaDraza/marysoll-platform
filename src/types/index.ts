/**
 * types/index.ts
 *
 * Centralni tipovi za Marysoll platformu.
 * Samo interface/type deklaracije — bez runtime vrednosti.
 * Runtime konstante su u types/constants.ts
 *
 * Re-exportuje i konstante iz constants.ts radi kompatibilnosti
 * (import { DAYS_OF_WEEK } from "@/types" radi kao i import iz "@/types/constants")
 */

import type { CampaignIntent } from "./conversational/intent";
import type { PlatformAudienceFilter } from "@/lib/newsletter/audienceFilter";
import type { CustomCta } from "@/lib/ai/landing/ctaCatalog";
import type { Types } from "mongoose";
import { LandingBlock } from "./landing-blocks";

// Re-export runtime konstanti iz constants.ts za backward compat
export { DAYS_OF_WEEK } from "./constants";

// ─── Common ───────────────────────────────────────────────────────────────────

export type HomePagePosition = "main" | "second" | "third" | "none";

export interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

/** Prilog u chat poruci — dele ga SalonInternalChat i SuperAdminChat modeli. */
export interface IChatAttachment {
  url: string;
  type: "image" | "pdf";
  name: string;
  size: number;
}

export type AboutTextLinkType = "link" | "mention" | "tag";

export interface AboutTextLink {
  text: string;
  url: string;
  type: AboutTextLinkType;
}

// ─── Service ──────────────────────────────────────────────────────────────────

/** Pretplata na USLUGU salona (mesečni paket tretmana) — ne mešati sa
 *  plan pretplatom tenanta (ISubscription u models/Subscription.ts). */
export interface IServiceSubscription {
  enabled: boolean;
  subscriptionType?: "monthly" | "package";
  treatmentCount?: number | null;
  priceMonthly: number | null;
  startDate: string | null;
  endDate: string | null;
  features: string[];
  usage: Record<string, number>;
  featureOverrides: Record<string, unknown> | null;
  overrideExpiresAt: Date | null;
  overrideNote: string | null;
  currentPeriodEnd: Date | null;
  status:
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "expired";
}

export type PriceMode = "fixed" | "on_request";

export interface IServiceVariant {
  name: string;
  price: number;
  priceMode?: PriceMode;
  duration: number;
  perItem: boolean;
  /** Opcioni dodatni opis varijante (npr. korekcija — uslovi, rok). */
  description?: string;
}

export interface IServiceExtra {
  name: string;
  price: number;
  priceMode?: PriceMode;
  duration: number;
  perItem: boolean;
}

export interface IServiceGroupItem {
  name: string;
  price: number;
  priceMode?: PriceMode;
  duration: number;
  description: string;
}

export interface IServiceInput {
  name: string;
  category: string;
  categorySlug?: string;
  subcategory?: string;
  price?: number | null;
  basePrice?: number | null;
  priceMode?: PriceMode;
  duration?: number;
  description: string;
  variants?: IServiceVariant[];
  extras?: IServiceExtra[];
  services?: IServiceGroupItem[];
  type: "single" | "group" | "variant";
  items: string[];
  featured?: HomePagePosition;
  icon?: string;
  subscription: IServiceSubscription;
}

export interface IService {
  _id: string;
  name: string;
  category: string;
  categorySlug?: string;
  subcategory?: string;
  price?: number | null;
  basePrice?: number | null;
  priceMode?: PriceMode;
  duration?: number;
  variants?: IServiceVariant[];
  extras?: IServiceExtra[];
  services?: IServiceGroupItem[];
  type: "single" | "group" | "variant";
  description: string;
  items: string[];
  featured?: HomePagePosition;
  icon?: string;
  subscription: IServiceSubscription;
  createdAt: string;
  updatedAt: string;
}

// ─── Appointment ──────────────────────────────────────────────────────────────

export interface IAppointmentVariant {
  name: string;
  price: number;
  duration: number;
  perItem: boolean;
}

export interface IAppointmentExtra {
  name: string;
  price: number;
  duration: number;
  perItem: boolean;
}

export interface IAppointmentService {
  serviceId: string;
  serviceName?: string;
  variants?: IAppointmentVariant[];
  extras?: IAppointmentExtra[];
  quantity: number;
  price: number;
  duration: number;
}

export interface IMessage {
  _id: string;
  sender: "client" | "admin";
  message: string;
  timestamp: Date;
}

export interface IAppointment {
  _id?: string;
  tenantId?: string;
  clientProfileId?: string; // TenantUser._id
  staffProfileId?: string; // TenantUser._id (optional)
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientInstagram?: string;
  preferredContact?: "phone" | "instagram" | "email" | "platform";
  contactNote?: string;
  serviceName: string;
  services: IAppointmentService[];
  duration: number;
  date: string;
  time: string;
  note?: string;
  cancellationWindowHours?: number;
  cancellationStatus?: "can_cancel" | "late_cancel";
  cancelledAt?: string | Date;
  cancelledBy?: "client" | "admin";
  cancellationType?: "legitimate" | "late";
  noShowMarkedAt?: string | Date;
  noShowReason?: "late_cancel" | "missed_appointment" | "admin_marked";
  status:
    | "pending"
    | "appointment_approved"
    | "appointment_rejected"
    | "appointment_rescheduled"
    | "appointment_cancelled"
    | "completed"
    | "no_show";
  messages: IMessage[];
  adminNotified: boolean;
  clientNotified: boolean;
  proposedDate?: string;
  proposedTime?: string;
  /** Server-side validiran gift/referral vaučer iz booking URL-a. */
  voucherCode?: string;
  lastUpdatedBy?: "client" | "admin";
  createdAt?: string | Date;
  updatedAt?: string | Date;
  unreadCount?: {
    client: number | null;
    admin: number | null;
  };
}

// ─── User ─────────────────────────────────────────────────────────────────────

export type NewsletterCategory =
  | "makeup"
  | "nails"
  | "discounts"
  | "events"
  | "tips"
  | "all";

export type NewsletterTemplateSlug =
  | "makeup-promo"
  | "nails-promo"
  | "discount-bonus"
  | "event-announcement"
  | "beauty-tips"
  | "welcome"
  | "birthday";

export interface INewsletterPreferences {
  subscribed: boolean;
  subscriptionDate?: Date;
  subscriptionSource: "footer" | "dashboard" | "checkout" | "admin";
  emailVerified: boolean;
  verificationToken?: string;
  verifiedAt?: Date;
  unsubscribeToken?: string;
  unsubscribedAt?: Date;
  lastEmailSent?: Date;
  openCount: number;
  clickCount: number;
}

export interface BasicNotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  browserNotifications: boolean;
}

export interface AppointmentNotificationSettings {
  appointmentCreated: boolean;
  appointmentApproved: boolean;
  appointmentRejected: boolean;
  appointmentRescheduled: boolean;
  appointmentCancelled: boolean;
  appointmentMessage: boolean;
  appointmentMessageEmail: boolean;
  appointmentReminder: boolean;
  reminderHours: number;
}

export interface TestimonialNotificationSettings {
  testimonialCreated: boolean;
  testimonialReplied: boolean;
  testimonialUpdated: boolean;
  testimonialDeleted: boolean;
  testimonialMessage: boolean;
}

export type UserNotificationSettings = BasicNotificationSettings &
  AppointmentNotificationSettings &
  TestimonialNotificationSettings & {
    newsletterPromotions: boolean;
    newsletterUpdates: boolean;
    newsletterTips: boolean;
  };

// NAPOMENA: ranije su ovde postojale DVE `IUser` deklaracije koje je TS tiho
// spajao (declaration merging) — klijentski oblik i mongoose Document oblik.
// Ovo je taj spojeni oblik zapisan eksplicitno; razdvajanje na IUser (klijent)
// i IUserDoc (model) je kandidat za Fazu 4 plana optimizacije.
export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  instagram?: string;
  marketingPhone?: string;
  newsletterEmail?: string;
  contactEmail?: string;
  birthday?: Date | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  globalRole: "SUPER_ADMIN" | "OWNER" | "ADMIN" | "STAFF" | "USER";
  tenantId: string | null;
  isOnline: boolean;
  lastActive: Date | string;
  createdAt: string;
  updatedAt: string;
  newsletterPreferences?: INewsletterPreferences;
  userType: "guest" | "legal";
  agreedToPrivacy: boolean;
  isEmailVerified: boolean;
  verificationToken: string | null;
  verificationTokenExpiry: Date | null;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  notificationSettings: UserNotificationSettings;
  pushSubscriptions: Array<{
    endpoint: string;
    keys: { p256dh: string; auth: string };
    createdAt: Date;
  }>;
}

// ─── Newsletter ───────────────────────────────────────────────────────────────

export interface NewsletterVariable {
  name: string;
  label: string;
  type:
    | "text"
    | "number"
    | "email"
    | "textarea"
    | "image"
    | "service"
    | "price"
    | "date"
    | "datetime-local"
    | "time"
    | "url"
    | "color";
  required?: boolean;
  defaultValue?: string;
  options?: string[];
  placeholder?: string;
}

export interface INewsletterTemplate {
  _id: string;
  scope?: "tenant" | "platform";
  tenantId?: string | Types.ObjectId;
  platformOwnerId?: string | Types.ObjectId;
  name: string;
  slug: string;
  isDefault?: boolean;
  subject: string;
  htmlTemplate: string;
  variables: NewsletterVariable[];
  thumbnail?: string;
  isActive: boolean;
  hasVariables: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface INewsletterCampaign {
  _id: string;
  scope?: "tenant" | "platform";
  tenantId?: string | Types.ObjectId;
  platformOwnerId?: string | Types.ObjectId;
  name: string;
  templateId: string | Types.ObjectId;
  subject: string;
  content: string;
  previewText?: string;
  manualRecipients: string[];
  sendToAll: boolean;
  audienceFilter?: PlatformAudienceFilter;
  ctaSlug: string;
  excludeRecentSubscribers?: boolean;
  excludeInactive?: boolean;
  status:
    | "draft"
    | "scheduled"
    | "sending"
    | "sent"
    | "failed"
    | "paused"
    | "stopped";
  scheduledFor?: Date;
  sentAt?: Date;
  sentCount: number;
  openCount: number;
  clickCount: number;
  unsubscribeCount: number;
  bounceCount: number;
  spamReportCount: number;
  isABTest?: boolean;
  abTestVariant?: "A" | "B";
  originalCampaignId?: string | Types.ObjectId;
  winningVariant?: "A" | "B" | null;
  createdAt: Date;
  updatedAt: Date;
  analytics?: {
    revenue?: number;
    appointmentsBooked?: number;
    conversionRate?: number;
    bestTime?: string;
    bestDay?: string;
  };
  semanticContent: {
    status: "empty" | "draft" | "approved" | "generated";
    source: "manual" | "ai" | "imported";
    intent: CampaignIntent;
    summary: string;
    keyPoints: string[];
    audience: string;
    ctaGoal: string;
    keywords: string[];
    tone: "informative" | "friendly" | "urgent" | "premium";
  };
  campaignType: "email-only" | "email-landing";
  landingPage: {
    enabled: boolean;
    slug?: string;
    status: "pending" | "generated" | "published" | "failed";
    generatedAt: Date;
    regeneratedCount: number;
    layout?: LandingBlock[];
    customCtas?: CustomCta[];
    semanticType?: string;
    audience?: "client" | "partner";
    editorialCategory?: string;
    score: number;
    seo: {
      title: string;
      description: string;
      keywords: string[];
      ogTitle: string;
      ogDescription: string;
      ogImage: string;
    };
  };
}

export interface NewsletterStats {
  totalSubscribers: number;
  activeSubscribers: number;
  recentSubscribers: number;
  totalCampaigns: number;
  avgOpenRate: number;
  avgClickRate: number;
  avgUnsubscribeRate: number;
  totalEmailsSent: number;
  growthRate: number;
  engagementRate: number;
  topCategories: {
    category: NewsletterCategory;
    count: number;
    openRate: number;
  }[];
  recentCampaigns: Array<{
    name: string;
    sentAt: Date;
    openRate: number;
    clickRate: number;
    unsubscribeRate: number;
  }>;
}

export interface NewsletterSubscriptionData {
  email: string;
  source: INewsletterPreferences["subscriptionSource"];
  name?: string;
  phone?: string;
  tenantId?: string | null;
}

export interface CampaignCreateData {
  name: string;
  templateId: string | undefined | null;
  defaultTemplateSlug: string | undefined | null;
  ctaSlug: string;
  subject: string;
  content: string;
  previewText: string;
  manualRecipients: string[];
  sendToAll: boolean;
  audienceFilter?: PlatformAudienceFilter;
  scheduledFor?: Date;
  isABTest?: boolean;
  excludeRecentSubscribers: boolean;
  excludeInactive: boolean;
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

export interface ITestimonial<T = string> {
  _id: string;
  clientProfileId: string; // TenantUser._id
  clientName: string;
  clientEmail: string;
  appointmentId: T;
  rating: number;
  comment: string;
  adminReply?: string;
  isApproved: boolean;
  isRead: boolean;
  isClientRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ITestimonialWithPopulatedAppointment extends ITestimonial<{
  _id: string;
  serviceName?: string;
  date?: string;
}> {
  appointmentId: {
    _id: string;
    serviceName?: string;
    date?: string;
  };
}

export interface ITestimonialWithAppointmentId extends ITestimonial {
  appointmentId: string;
}

export interface TestimonialsResponse {
  testimonials: ITestimonial<{
    _id: string;
    serviceName: string;
    date: string;
  }>[];
  pagination: PaginationInfo;
}

export interface CreateTestimonialData {
  appointmentId: string;
  rating: number;
  comment: string;
}

export interface UpdateTestimonialData {
  rating?: number;
  comment?: string;
  adminReply?: string;
  isApproved?: boolean;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface INotification {
  _id: string;
  recipientProfileId: string; // TenantUser._id
  tenantId?: string;
  type:
    | "appointment_created"
    | "appointment_approved"
    | "appointment_rejected"
    | "appointment_rescheduled"
    | "appointment_cancelled"
    | "appointment_message"
    | "appointment_reminder"
    | "testimonial_created"
    | "testimonial_replied"
    | "testimonial_updated"
    | "testimonial_deleted"
    | "testimonial_message"
    | "chat_message"
    | "generic"
    | "loyalty_hearts_earned"
    | "loyalty_points_earned"
    | "loyalty_voucher_received"
    | "loyalty_voucher_redeemed"
    | "loyalty_tier_upgraded"
    | "loyalty_adjustment"
    | "loyalty_completion_prompt";
  title: string;
  message: string;
  isRead: boolean;
  appointmentId?: string;
  testimonialId?: string;
  metadata: {
    oldDate?: string;
    oldTime?: string;
    newDate?: string;
    newTime?: string;
    sender?: "client" | "admin";
    clientProfileId?: string;
    serviceName?: string;
    clientName?: string;
    rating?: number;
    hearts?: number;
    points?: number;
    heartsBalance?: number;
    heartsRequired?: number;
    currencyName?: string;
    voucherCode?: string;
    voucherType?: string;
    voucherValue?: number;
    voucherExpiresAt?: string;
    tierName?: string;
    celebration?: boolean;
    celebrationSeen?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AppointmentForNotification {
  _id: string;
  clientProfileId: string; // TenantUser._id
  clientName: string;
  serviceName: string;
  date?: string;
  time?: string;
}

export interface TestimonialForNotification {
  _id: string;
  clientProfileId: string; // TenantUser._id
  clientName: string;
  rating: number;
  appointmentId: { serviceName: string; _id: string };
}

export interface CountResult {
  total: number;
}

// ─── Email ────────────────────────────────────────────────────────────────────

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  type?: "salon" | "newsletter" | "system";
  tenantId?: string | null;
}

export interface AppointmentNotificationData {
  clientName: string;
  serviceName: string;
  /** Total price of the booked service(s), in RSD. */
  price?: number | null;
  tenantId?: string | Types.ObjectId;
  date: string;
  time: string;
  appointmentId: string;
  note?: string;
  adminNote?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientInstagram?: string;
  preferredContact?: "phone" | "instagram" | "email" | "platform";
  contactNote?: string;
  /** Used for rescheduled notifications */
  proposedDate?: string;
  proposedTime?: string;
  lastUpdatedBy?: "client" | "admin";
}

export interface TestimonialNotificationData {
  clientName: string;
  serviceName: string;
  rating: number;
  comment: string;
  adminReply?: string;
  tenantId?: string | null;
}

// ─── Salon Profile ────────────────────────────────────────────────────────────

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  whatsapp?: string;
  telegram?: string;
  [key: string]: string | undefined;
}

export interface SeoData {
  homeTitle?: string;
  homeDescription?: string;
  uslugeTitle?: string;
  uslugeDescription?: string;
  terminiTitle?: string;
  terminiDescription?: string;
}

export interface IBranding {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
}

export interface ITimeSlot {
  from: string; // "HH:mm"
  to: string; // "HH:mm"
}

export type DayOfWeek =
  | "Ponedeljak"
  | "Utorak"
  | "Sreda"
  | "Četvrtak"
  | "Petak"
  | "Subota"
  | "Nedelja";

/** WorkingHoursMap: svaki dan = niz slotova. Prazan niz = neradan dan. */
export type WorkingHoursMap = Record<DayOfWeek, ITimeSlot[]>;

/** Jedan godišnji odmor: opseg datuma "YYYY-MM-DD". */
export interface IVacation {
  from: string; // "YYYY-MM-DD"
  to: string; // "YYYY-MM-DD"
}

/**
 * Način na koji salon definiše dostupnost:
 *   "workingHours" — opseg po danu, termini auto-generisani na interval (default)
 *   "manualSlots"  — eksplicitni termini po konkretnom datumu (vidi ManualSlotsMap)
 */
export type AvailabilityMode = "workingHours" | "manualSlots";

/** Jedan ručno definisan termin za konkretan datum. */
export interface IManualSlot {
  time: string; // "HH:mm"
  duration: number; // minuti
  serviceId?: string; // opciono unapred izabrana usluga
}

/** Ručni termini po datumu, ključ je "YYYY-MM-DD". Prazan niz = neradan dan. */
export type ManualSlotsMap = Record<string, IManualSlot[]>;

/** @deprecated Koristiti WorkingHoursMap */
export interface WorkingHours {
  Ponedeljak?: string;
  Utorak?: string;
  Sreda?: string;
  Četvrtak?: string;
  Petak?: string;
  Subota?: string;
  Nedelja?: string;
}

export interface SalonProfile {
  _id: string;
  tenantId?: string;
  name: string;
  email: string;
  description: string;
  logo?: string | null;
  notificationLogo?: string | null;
  phone: string;
  street: string;
  city: string;
  lat?: number | null;
  lng?: number | null;
  social: SocialLinks;
  newsletterEmail: string;
  contactEmail?: string;
  bookingEmail?: string;
  marketingPhone?: string;
  resendApiKey?: string;
  createdAt?: string;
  updatedAt?: string;
  workingHours?: WorkingHoursMap | Record<string, unknown>;
  vacations?: IVacation[];
  availabilityMode?: AvailabilityMode;
  manualSlots?: ManualSlotsMap;
  showWorkingHours?: boolean;
  cancellationWindowHours?: number;
  seo?: SeoData;
  branding?: IBranding;
  landingStructure?: LandingStructure;
  isDemo?: boolean;
  clientGender?: ClientGender;
}

export type LandingTheme =
  | "theme-1"
  | "theme-2"
  | "theme-3"
  | "theme-4"
  | "theme-5"
  | "theme-6"
  | "theme-7"
  | "theme-8"
  | "theme-9";

/**
 * Controls which gallery editor UI is shown in the CMS and
 * which data structure the theme components consume.
 *   "images-only"           — flat HeroImage array (masonry layouts)
 *   "images-with-category"  — treatments array with category/title/description (zigzag layouts)
 */
export type GalleryVariant = "images-only" | "images-with-category";

export interface ISalonProfileForm {
  name: string;
  email: string;
  description: string;
  phone: string;
  street: string;
  city: string;
  newsletterEmail: string;
  contactEmail: string;
  bookingEmail: string;
  marketingPhone: string;
  resendApiKey: string;
  logo: string | null;
  notificationLogo: string | null;
  social: SocialLinks;
  workingHours: WorkingHoursMap;
  vacations: IVacation[];
  availabilityMode: AvailabilityMode;
  manualSlots: ManualSlotsMap;
  showWorkingHours: boolean;
  cancellationWindowHours: number;
  seo: SeoData;
  branding: IBranding;
  landingTheme: LandingTheme;
  landingStructure: LandingStructure;
  clientGender?: ClientGender;
}

/**
 * Rod klijentele salona za obraćanje u tekstovima (dugmad, badge-evi,
 * obaveštenja). "neutral" = trenutno ponašanje (dual/muški oblik);
 * "female" = ženski rod (npr. salon za trepavice/nokte sa ženskom klijentelom).
 */
export type ClientGender = "neutral" | "female";

export interface IServiceLanding {
  headline: string;
  subheadline?: string;
  description: string[];
  lists: string[];
}

/** Shared image shape used across hero, gallery and about sections. */
export interface HeroImage {
  src: string;
  alt?: string;
}

/** One gallery entry — compatible with both zigzag (Theme1/2) and masonry (Theme3) layouts. */
export interface GalleryItem {
  id?: string;
  category?: string;
  title?: string;
  description?: string;
  /** 1–4 images depending on layout variant. */
  images: HeroImage[];
  href?: string;
}

export interface LandingStructure {
  landing: {
    hero: {
      enabled: boolean;

      variant?: "center-image" | "split-left-image" | "grid-right-images";

      headline?: string; // fallback: salon name
      subheadline?: string;
      whereWhatForWhom?: string;

      /** Single hero image — used by Theme2 (imageUrl) and Theme3 center/split variants. */
      image?: HeroImage;

      /** Multi-image grid — used by Theme3 grid-right-images variant. */
      images?: HeroImage[];

      contact: {
        location?: string;
        phone?: string;
      };

      socialLinks?: {
        instagram?: string;
        facebook?: string;
        tiktok?: string;
        whatsapp?: string;
        telegram?: string;
      };

      ctas: {
        primary: {
          text: string;
          href: string;
        };
        secondary?: {
          text: string;
          href: string;
        };
      };

      /**
       * Theme-8 (Y2K Lash) specific hero text. Optional — only the theme-8 CMS
       * editor surfaces these fields and only Theme8Hero reads them; other themes
       * ignore the block entirely.
       */
      theme8?: {
        /** Small badge above the wordmark (default: "Cute? Always. Basic? Never."). */
        eyebrow?: string;
        /**
         * Per-span control of the stacked Y2K wordmark. Any empty field falls
         * back to parsing `headline` (or the salon name).
         */
        wordmark?: {
          prefix?: string; // small top line, default "The"
          line1?: string; // chrome-gradient line
          line2?: string; // pink ink-stroked line
          tail?: string; // caveat script tail, e.g. "by Anja"
        };
        /** Marquee strip terms (e.g. CLASSIC, HYBRID, VOLUMEN). */
        marquee?: string[];
        /** Captions on the hero photo collage. */
        photoCaptions?: {
          primary?: string; // caption on the main lash photo
          founder?: string; // caption on the founder polaroid
        };
      };
    };
    stats: { value: string; label: string }[]; // max 4 u UI
    about: {
      enabled: boolean;

      headline?: string;
      paragraphs: string[]; // max 2 u UI
      links?: AboutTextLink[];

      /** Optional about-section image. Layout falls back gracefully when absent. */
      image?: HeroImage;

      /**
       * Additional about-section images. Theme-8 uses [0] as the main portrait
       * (falls back to `image`) and [1] as the secondary polaroid.
       */
      images?: HeroImage[];

      /** Manually entered years of experience shown in stats. */
      yearsOfExperience?: number;

      /**
       * Salon opening year. When set, "years of experience" auto-increments each
       * year (currentYear − openingYear) and takes precedence over the manual
       * yearsOfExperience value.
       */
      openingYear?: number;
    };
    artists: {
      enabled: boolean;
      headline: string;
      members: {
        name: string;
        role: string;
        bio: string;
        image: {
          src: string;
          alt: string;
        };
      }[];
    };

    servicesPreview: {
      enabled: boolean;

      headline?: string;
      subheadline?: string;
      showIcons?: boolean;
      image?: HeroImage;
      // services se ucitavaju iz DB
    };

    appointmentSection: {
      enabled: boolean;

      headline?: string;
      subheadline?: string;

      instructions: {
        name: string;
        icon: string; // Heroicon name npr "CalendarDaysIcon"
      }[];
    };

    testimonials: {
      enabled: boolean;

      headline?: string;
      // content dolazi iz DB
    };

    gallery: {
      enabled: boolean;

      /** "zigzag" = Theme1/2 alternating rows. "masonry" = Theme3 column layout. */
      variant?: "zigzag" | "masonry";

      /**
       * Controls which data structure is active and which CMS editor is shown.
       * Derived from THEME_CONFIG[landingTheme].gallery.variant at runtime.
       * Persisted here so the document is self-describing.
       */
      galleryVariant?: GalleryVariant;

      headline?: string;
      subheadline?: string;

      instagram: {
        username?: string; // @handle
        link?: string;
        ctaText?: string;
      };

      /**
       * Legacy zigzag treatments used by Theme1GallerySection / Theme2GalleryGrid.
       * Kept as-is for full backward compatibility.
       */
      treatments: {
        id: string;
        category: string;
        title: string;
        description: string;
        images: { src: string; alt: string }[];
        href: string;
      }[];

      /**
       * Normalised gallery items for Theme3GalleryMasonry and future layouts.
       * Falls back to DEFAULT_TREATMENTS inside the component when empty.
       */
      items?: GalleryItem[];

      /** Flat image array — powers Theme3GallerySoft and Theme3GalleryMasonry. */
      images?: HeroImage[];
    };

    faq: {
      enabled: boolean;

      headline?: string;
      subheadline?: string;

      support: {
        text?: string;
        email?: string;
      };

      items: {
        question: string;
        answer: string;
      }[];
    };

    blog?: {
      enabled: boolean;
      headline?: string;
      paragraph?: string;
    };

    /**
     * Theme-8 (Y2K) "beauty perks" sekcija — isti paper-panel stil kao About,
     * centrirana slika (ili kolaž), pill/eyebrow/title, do 4 paragrafa i dva
     * opciona CTA-a (registracija + pravila). Renderuje je samo theme-8.
     */
    perks?: {
      enabled: boolean;
      pill?: string;
      eyebrow?: string;
      headline?: string;
      paragraphs?: string[];
      images?: HeroImage[];
      ctas?: {
        primary?: { text: string; href: string };
        secondary?: { text: string; href: string };
      };
    };
  };

  pages: {
    servicesPage: {
      headline?: string;
      subheadline?: string;
      paragraph?: string;
    };

    appointmentsPage: {
      headline?: string;
      subheadline?: string;
      paragraph?: string;

      ctas?: {
        primary?: {
          text: string;
          href: string;
        };
        secondary?: {
          text: string;
          href: string;
        };
      };
    };
  };
}

export interface SalonProfileData {
  _id: string;
  name: string;
  email: string;
  description: string;
  landingTheme?: LandingTheme;
  landingStructure?: LandingStructure;
  clientGender?: ClientGender;
  isDemo?: boolean;
  logo?: string | null;
  /** Raster logo za push/mejl i ikonu instalirane tenant PWA. */
  notificationLogo?: string | null;
  phone: string;
  street: string;
  city: string;
  lat?: number | null;
  lng?: number | null;
  social: SocialLinks;
  newsletterEmail?: string;
  contactEmail?: string;
  workingHours?: WorkingHoursMap | Record<string, unknown>;
  vacations?: IVacation[];
  availabilityMode?: AvailabilityMode;
  manualSlots?: ManualSlotsMap;
  showWorkingHours?: boolean;
  seo?: SeoData;
  branding?: IBranding;
  tenantSlug?: string;
}

// ─── Notification Settings (standalone) ──────────────────────────────────────

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  browserNotifications: boolean;
  appointmentCreated: boolean;
  appointmentApproved: boolean;
  appointmentRejected: boolean;
  appointmentRescheduled: boolean;
  appointmentCancelled: boolean;
  appointmentMessage: boolean;
  appointmentMessageEmail: boolean;
  appointmentReminder: boolean;
  reminderHours: number;
  testimonialCreated: boolean;
  testimonialReplied: boolean;
  testimonialUpdated: boolean;
  testimonialDeleted: boolean;
  testimonialMessage: boolean;
  newsletterPromotions: boolean;
  newsletterUpdates: boolean;
  newsletterTips: boolean;
}

export type TimeSlot = {
  from: string; // "08:00"
  to: string; // "21:00"
};

export type WorkingHoursRaw = {
  [day: string]: TimeSlot[] | [] | null | undefined;
};

export type DayWorkingInfo = {
  dayName: string;
  isWorking: boolean;
  slots: TimeSlot[]; // može biti više slotova
};
