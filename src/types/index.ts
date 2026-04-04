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

// ─── Service ──────────────────────────────────────────────────────────────────

export interface ISubscription {
  enabled: boolean;
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

export interface IServiceVariant {
  name: string;
  price: number;
  duration: number;
  perItem: boolean;
}

export interface IServiceExtra {
  name: string;
  price: number;
  duration: number;
  perItem: boolean;
}

export interface IServiceGroupItem {
  name: string;
  price: number;
  duration: number;
  description: string;
}

export interface IServiceInput {
  name: string;
  category: string;
  subcategory?: string;
  price?: number | null;
  basePrice?: number | null;
  duration?: number;
  description: string;
  variants?: IServiceVariant[];
  extras?: IServiceExtra[];
  services?: IServiceGroupItem[];
  type: "single" | "group" | "variant";
  items: string[];
  featured?: HomePagePosition;
  subscription: ISubscription;
}

export interface IService {
  _id: string;
  name: string;
  category: string;
  subcategory?: string;
  price?: number | null;
  basePrice?: number | null;
  duration?: number;
  variants?: IServiceVariant[];
  extras?: IServiceExtra[];
  services?: IServiceGroupItem[];
  type: "single" | "group" | "variant";
  description: string;
  items: string[];
  featured?: HomePagePosition;
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
  clientId: string;
  clientName: string;
  clientEmail: string;
  serviceName: string;
  services: IAppointmentService[];
  duration: number;
  date: string;
  time: string;
  note?: string;
  status:
    | "pending"
    | "appointment_approved"
    | "appointment_rejected"
    | "appointment_rescheduled"
    | "appointment_cancelled";
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
  clientId: string;
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
  userId: string;
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
    clientId?: string;
    serviceName?: string;
    clientName?: string;
    rating?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AppointmentForNotification {
  _id: string;
  clientId: string;
  clientName: string;
  serviceName: string;
  date?: string;
  time?: string;
}

export interface TestimonialForNotification {
  _id: string;
  clientId: string;
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
}

// ─── Salon Profile ────────────────────────────────────────────────────────────

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
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
  social: SocialLinks;
  newsletterEmail: string;
  contactEmail?: string;
  createdAt?: string;
  updatedAt?: string;
  workingHours?: WorkingHoursMap | Record<string, unknown>;
  seo?: SeoData;
  branding?: IBranding;
}

export type LandingTheme = "theme-1" | "theme-2" | "theme-3";

export interface ISalonProfileForm {
  name: string;
  email: string;
  description: string;
  phone: string;
  street: string;
  city: string;
  newsletterEmail: string;
  contactEmail: string;
  logo: string | null;
  social: SocialLinks;
  workingHours: WorkingHoursMap;
  seo: SeoData;
  branding: IBranding;
  landingTheme: LandingTheme;
}

export interface SalonProfileData {
  _id: string;
  name: string;
  email: string;
  description: string;
  logo?: string | null;
  phone: string;
  street: string;
  city: string;
  social: SocialLinks;
  newsletterEmail?: string;
  contactEmail?: string;
  workingHours?: WorkingHoursMap | Record<string, unknown>;
  seo?: SeoData;
  branding?: IBranding;
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
