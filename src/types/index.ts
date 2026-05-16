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

import type { CampaignIntent } from "./conversational/campaign";
import type { Types } from "mongoose";
import { LandingBlock } from "./landing-blocks";

// Re-export runtime konstanti iz constants.ts za backward compat
export {
  DAYS_OF_WEEK,
  SERVICE_TYPES,
  HOME_PAGE_POSITIONS,
  PLAN_TYPES,
  TENANT_STATUSES,
  APPOINTMENT_STATUSES,
} from "./constants";
export type {
  ServiceType,
  HomePagePositionValue,
  PlanType,
  TenantStatusValue,
  AppointmentStatusValue,
} from "./constants";

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

export type AboutTextLinkType = "link" | "mention" | "tag";

export interface AboutTextLink {
  text: string;
  url: string;
  type: AboutTextLinkType;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export interface ISubscription {
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
  subscription: ISubscription;
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
  subscription: ISubscription;
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

export interface IUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  instagram?: string;
  marketingPhone?: string;
  newsletterEmail?: string;
  contactEmail?: string;
  birthday?: Date | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
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
  notificationSettings: UserNotificationSettings;
  pushSubscriptions: Array<{
    endpoint: string;
    keys: { p256dh: string; auth: string };
    createdAt: Date;
  }>;
}

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  phone: string;
  instagram?: string;
  birthday?: Date | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  globalRole: "SUPER_ADMIN" | "OWNER" | "ADMIN" | "STAFF" | "USER";
  agreedToPrivacy: boolean;
  isOnline: boolean;
  lastActive: Date | string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  notificationSettings: UserNotificationSettings;
  pushSubscriptions: Array<{
    endpoint: string;
    keys: { p256dh: string; auth: string };
    createdAt: Date;
  }>;
  newsletterPreferences?: INewsletterPreferences;
  createdAt: string;
  updatedAt: string;
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
  name: string;
  templateId: string | Types.ObjectId;
  subject: string;
  content: string;
  previewText?: string;
  manualRecipients: string[];
  sendToAll: boolean;
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
    semanticType?: "promotion" | "event" | "service" | "blog" | "other";
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
    | "testimonial_created"
    | "testimonial_replied"
    | "testimonial_updated"
    | "testimonial_deleted"
    | "testimonial_message"
    | "chat_message"
    | "generic";
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
  type?: "salon" | "newsletter" | "system";
  tenantId?: string | null;
}

export interface AppointmentNotificationData {
  clientName: string;
  serviceName: string;
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
  phone: string;
  street: string;
  city: string;
  lat?: number | null;
  lng?: number | null;
  social: SocialLinks;
  newsletterEmail: string;
  contactEmail?: string;
  marketingPhone?: string;
  resendApiKey?: string;
  createdAt?: string;
  updatedAt?: string;
  workingHours?: WorkingHoursMap | Record<string, unknown>;
  cancellationWindowHours?: number;
  seo?: SeoData;
  branding?: IBranding;
  landingStructure?: LandingStructure;
  isDemo?: boolean;
}

export type LandingTheme =
  | "theme-1"
  | "theme-2"
  | "theme-3"
  | "theme-4"
  | "theme-5"
  | "theme-6";

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
  marketingPhone: string;
  resendApiKey: string;
  logo: string | null;
  social: SocialLinks;
  workingHours: WorkingHoursMap;
  cancellationWindowHours: number;
  seo: SeoData;
  branding: IBranding;
  landingTheme: LandingTheme;
  landingStructure: LandingStructure;
}

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
    };
    stats: { value: string; label: string }[]; // max 4 u UI
    about: {
      enabled: boolean;

      headline?: string;
      paragraphs: string[]; // max 2 u UI
      links?: AboutTextLink[];

      /** Optional about-section image. Layout falls back gracefully when absent. */
      image?: HeroImage;
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
  isDemo?: boolean;
  logo?: string | null;
  phone: string;
  street: string;
  city: string;
  lat?: number | null;
  lng?: number | null;
  social: SocialLinks;
  newsletterEmail?: string;
  contactEmail?: string;
  workingHours?: WorkingHoursMap | Record<string, unknown>;
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
