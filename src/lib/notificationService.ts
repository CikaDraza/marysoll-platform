import "server-only";

// lib/notificationService.ts
import { Notification } from "@/models/Notification";
import { connectToDB } from "@/lib/db/mongodb";
import { INotification, UserNotificationSettings } from "@/types";
import { Types } from "mongoose";
import { TenantUser } from "@/models/TenantUser";
import { AuthUser } from "@/models/AuthUser";
import { SalonProfile } from "@/models/SalonProfile";
import {
  sendAppointmentMessageNotification,
  sendAppointmentNotification,
  sendTestimonialNotification,
} from "./email/email";
import { sendWebPushToUser, sendWebPushToMany } from "@/lib/webPush";
import type { PushPayload } from "@/lib/webPush";

// ── Salon branding for push payloads ─────────────────────────────────────────

async function getSalonBranding(tenantId: Types.ObjectId | string): Promise<{ icon: string; name: string }> {
  try {
    const profile = (await SalonProfile.findOne({ tenantId })
      .select("logo name")
      .lean()) as { logo?: string; name?: string } | null;
    return {
      icon: profile?.logo || "/notification-icon.png",
      name: profile?.name || "Salon",
    };
  } catch {
    return { icon: "/notification-icon.png", name: "Salon" };
  }
}

interface CreateNotificationParams {
  recipientProfileId: string | Types.ObjectId;  // TenantUser._id
  tenantId: Types.ObjectId | string;
  type: INotification["type"];
  title: string;
  message: string;
  appointmentId?: string | Types.ObjectId;
  testimonialId?: string | Types.ObjectId;
  metadata?: Record<string, unknown>;
}

export async function createNotification(params: CreateNotificationParams) {
  await connectToDB();

  const validTypes = [
    "appointment_created",
    "appointment_approved",
    "appointment_rejected",
    "appointment_rescheduled",
    "appointment_cancelled",
    "appointment_message",
    "testimonial_created",
    "testimonial_replied",
    "testimonial_updated",
    "testimonial_deleted",
    "testimonial_message",
  ];

  if (!validTypes.includes(params.type)) {
    console.error(`Invalid notification type: ${params.type}`);
    throw new Error(`Invalid notification type: ${params.type}`);
  }

  try {
    const notification = new Notification({
      recipientProfileId:
        typeof params.recipientProfileId === "string"
          ? new Types.ObjectId(params.recipientProfileId)
          : params.recipientProfileId,
      tenantId:
        typeof params.tenantId === "string"
          ? new Types.ObjectId(params.tenantId)
          : params.tenantId,
      type: params.type,
      title: params.title,
      message: params.message,
      appointmentId: params.appointmentId
        ? typeof params.appointmentId === "string"
          ? new Types.ObjectId(params.appointmentId)
          : params.appointmentId
        : undefined,
      testimonialId: params.testimonialId
        ? typeof params.testimonialId === "string"
          ? new Types.ObjectId(params.testimonialId)
          : params.testimonialId
        : undefined,
      metadata: params.metadata,
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

// Fetch all OWNER/ADMIN TenantUser IDs for a specific tenant
async function getAllAdminTenantUserIds(
  tenantId: Types.ObjectId | string,
): Promise<string[]> {
  await connectToDB();

  try {
    const adminProfiles = await TenantUser.find({
      tenantId:
        typeof tenantId === "string" ? new Types.ObjectId(tenantId) : tenantId,
      role: { $in: ["OWNER", "ADMIN"] },
    }).select("_id").lean<{ _id: Types.ObjectId }[]>();

    return adminProfiles.map((p) => p._id.toString());
  } catch (error) {
    console.error("Error getting admin TenantUsers:", error);
    return [];
  }
}

// Definiši tipove za appointment i testimonial
interface AppointmentForNotification {
  _id: string;
  tenantId: Types.ObjectId | string;
  clientProfileId: string;    // TenantUser._id
  clientName: string;
  serviceName: string;
  date?: string;
  time?: string;
  note?: string;
}

interface TestimonialForNotification {
  _id: string;
  tenantId: Types.ObjectId | string;
  clientProfileId: string;    // TenantUser._id
  clientName: string;
  rating: number;
  comment: string;
  adminReply?: string;
  isRead?: boolean;
  isClientRead?: boolean;
  appointmentId: {
    serviceName: string;
    _id: string;
    date?: string;
  };
}

// TYPE-SAFE MAPE za settings keys
type AppointmentType =
  | "created"
  | "approved"
  | "rejected"
  | "rescheduled"
  | "cancelled"
  | "message";
type TestimonialType =
  | "created"
  | "replied"
  | "updated"
  | "deleted"
  | "message";

const appointmentSettingMap: Record<
  AppointmentType,
  keyof UserNotificationSettings
> = {
  created: "appointmentCreated",
  approved: "appointmentApproved",
  rejected: "appointmentRejected",
  rescheduled: "appointmentRescheduled",
  cancelled: "appointmentCancelled",
  message: "appointmentMessageEmail",
} as const;

const testimonialSettingMap: Record<
  TestimonialType,
  keyof UserNotificationSettings
> = {
  created: "testimonialCreated",
  replied: "testimonialReplied",
  updated: "testimonialUpdated",
  deleted: "testimonialDeleted",
  message: "testimonialMessage",
} as const;

function getAppointmentSettingKey(
  type: AppointmentType,
): keyof UserNotificationSettings {
  return appointmentSettingMap[type];
}

function getTestimonialSettingKey(
  type: TestimonialType,
): keyof UserNotificationSettings {
  return testimonialSettingMap[type];
}

function isValidNotificationKey(
  key: string,
): key is keyof UserNotificationSettings {
  const validKeys: (keyof UserNotificationSettings)[] = [
    "emailNotifications",
    "reminderHours",
    ...Object.values(appointmentSettingMap),
    ...Object.values(testimonialSettingMap),
  ];
  return validKeys.includes(key as keyof UserNotificationSettings);
}

function getSettingValue(
  settings: UserNotificationSettings | null | undefined,
  key: keyof UserNotificationSettings,
  defaultValue: boolean | number,
): boolean | number {
  if (!settings) return defaultValue;
  const value = settings[key];
  if (value === undefined) return defaultValue;
  return value;
}

// Get notification settings from TenantUser
async function getTenantUserNotificationSettings(
  tenantUserId: string,
): Promise<UserNotificationSettings | null> {
  try {
    const tenantUser = await TenantUser.findById(tenantUserId)
      .select("notificationSettings")
      .lean<{ notificationSettings: UserNotificationSettings }>();
    if (!tenantUser) return null;
    return (tenantUser.notificationSettings as UserNotificationSettings) || null;
  } catch (error) {
    console.error("Error getting TenantUser notification settings:", error);
    return null;
  }
}

// Get email for a TenantUser by joining to AuthUser
async function getTenantUserEmail(tenantUserId: string): Promise<string | null> {
  try {
    const tenantUser = await TenantUser.findById(tenantUserId)
      .select("authUserId")
      .lean<{ authUserId: Types.ObjectId }>();
    if (!tenantUser) return null;

    const authUser = await AuthUser.findById(tenantUser.authUserId)
      .select("email")
      .lean<{ email: string }>();

    return authUser?.email ?? null;
  } catch (error) {
    console.error("Error getting email for TenantUser:", error);
    return null;
  }
}

// Get all OWNER/ADMIN TenantUsers with their emails for a tenant
async function getAdminTenantUsersWithEmails(
  tenantId: Types.ObjectId | string,
): Promise<Array<{ id: string; email: string; notificationSettings: UserNotificationSettings | null }>> {
  await connectToDB();

  try {
    const resolvedTenantId =
      typeof tenantId === "string" ? new Types.ObjectId(tenantId) : tenantId;

    const adminProfiles = await TenantUser.find({
      tenantId: resolvedTenantId,
      role: { $in: ["OWNER", "ADMIN"] },
    })
      .select("_id authUserId notificationSettings")
      .lean<{ _id: Types.ObjectId; authUserId: Types.ObjectId; notificationSettings: UserNotificationSettings }[]>();

    const results = await Promise.all(
      adminProfiles.map(async (profile) => {
        const authUser = await AuthUser.findById(profile.authUserId)
          .select("email")
          .lean<{ email: string }>();

        return {
          id: profile._id.toString(),
          email: authUser?.email ?? "",
          notificationSettings: (profile.notificationSettings as UserNotificationSettings) || null,
        };
      }),
    );

    return results.filter((r) => r.email !== "");
  } catch (error) {
    console.error("Error getting admin TenantUsers with emails:", error);
    return [];
  }
}

export async function createAppointmentNotification(
  appointment: AppointmentForNotification,
  type: AppointmentType,
  additionalData?: { sender?: "client" | "admin"; message?: string },
) {
  await sendAppointmentEmailNotifications(appointment, type, additionalData);

  const fullTypeMap = {
    created: "appointment_created",
    approved: "appointment_approved",
    rejected: "appointment_rejected",
    rescheduled: "appointment_rescheduled",
    cancelled: "appointment_cancelled",
    message: "appointment_message",
  } as const;

  const fullType = fullTypeMap[type];

  const notificationConfig = {
    created: {
      adminTitle: "Novi termin zakazan",
      adminMessage: `Klijent ${appointment.clientName} je zakazao termin za ${appointment.serviceName}`,
      clientTitle: "Termin zakazan",
      clientMessage: `Vaš termin za ${appointment.serviceName} je uspešno zakazan i čeka odobrenje`,
    },
    approved: {
      adminTitle: "Termin odobren",
      adminMessage: `Odobrili ste termin za ${appointment.serviceName} klijentu ${appointment.clientName}`,
      clientTitle: "Termin odobren",
      clientMessage: `Vaš termin za ${appointment.serviceName} je odobren`,
    },
    rejected: {
      adminTitle: "Termin odbijen",
      adminMessage: `Odbili ste termin za ${appointment.serviceName} klijentu ${appointment.clientName}`,
      clientTitle: "Termin odbijen",
      clientMessage: `Vaš termin za ${appointment.serviceName} je odbijen`,
    },
    rescheduled: {
      adminTitle: "Termin pomeren",
      adminMessage: `Predložili ste novi termin za ${appointment.serviceName} klijentu ${appointment.clientName}`,
      clientTitle: "Termin pomeren",
      clientMessage: `Admin je predložio novi termin za ${appointment.serviceName}`,
    },
    cancelled: {
      adminTitle: "Termin otkazan",
      adminMessage: `Otkazali ste termin za ${appointment.serviceName} klijentu ${appointment.clientName}`,
      clientTitle: "Termin otkazan",
      clientMessage: `Vaš termin za ${appointment.serviceName} je otkazan`,
    },
    message: {
      adminTitle: "Nova poruka od klijenta",
      adminMessage: `Klijent ${appointment.clientName} Vam je poslao poruku za termin: ${appointment.serviceName}`,
      clientTitle: "Nova poruka od salona",
      clientMessage: `Salon Vam je poslao poruku za termin: ${appointment.serviceName}`,
    },
  };

  const config = notificationConfig[type];

  const { icon, name: salonName } = await getSalonBranding(appointment.tenantId);
  const panelUrl = "/panel?tab=Moji%20Termini";
  const adminUrl = "/admin/termini";

  if (type === "message") {
    if (additionalData?.sender === "client") {
      const adminIds = await getAllAdminTenantUserIds(appointment.tenantId);
      const notifications = [];
      for (const adminId of adminIds) {
        const notification = await createNotification({
          recipientProfileId: adminId,
          tenantId: appointment.tenantId,
          type: fullType,
          title: config.adminTitle,
          message: config.adminMessage,
          appointmentId: appointment._id,
          metadata: {
            clientName: appointment.clientName,
            serviceName: appointment.serviceName,
            sender: "client",
            preview: additionalData.message?.substring(0, 50) || "Nova poruka",
          },
        });
        notifications.push(notification);
      }
      await sendWebPushToMany(adminIds, {
        title: salonName,
        body: `💬 ${appointment.clientName}: ${additionalData.message?.substring(0, 80) || "Nova poruka za " + appointment.serviceName}`,
        icon,
        tag: `appt-msg-${appointment._id}`,
        url: adminUrl,
      });
      return notifications;
    } else {
      const notification = await createNotification({
        recipientProfileId: appointment.clientProfileId,
        tenantId: appointment.tenantId,
        type: fullType,
        title: config.clientTitle,
        message: config.clientMessage,
        appointmentId: appointment._id,
        metadata: {
          serviceName: appointment.serviceName,
          sender: "admin",
          preview: additionalData?.message?.substring(0, 50) || "Nova poruka",
        },
      });
      await sendWebPushToUser(appointment.clientProfileId, {
        title: salonName,
        body: `💬 Nova poruka za ${appointment.serviceName}`,
        icon,
        tag: `appt-msg-${appointment._id}`,
        url: panelUrl,
      });
      return notification;
    }
  }

  if (type === "created") {
    const adminIds = await getAllAdminTenantUserIds(appointment.tenantId);
    const notifications = [];
    for (const adminId of adminIds) {
      const notification = await createNotification({
        recipientProfileId: adminId,
        tenantId: appointment.tenantId,
        type: fullType,
        title: config.adminTitle,
        message: config.adminMessage,
        appointmentId: appointment._id,
        metadata: {
          clientName: appointment.clientName,
          serviceName: appointment.serviceName,
        },
      });
      notifications.push(notification);
    }
    await sendWebPushToMany(adminIds, {
      title: salonName,
      body: `📅 ${appointment.clientName} je zakazao/la ${appointment.serviceName}${appointment.date ? " — " + appointment.date : ""}`,
      icon,
      tag: `appt-created-${appointment._id}`,
      url: adminUrl,
    });
    return notifications;
  } else {
    const pushBodyMap: Record<string, string> = {
      approved: `✅ Termin odobren — ${appointment.serviceName}${appointment.date ? " " + appointment.date : ""}`,
      rejected: `❌ Termin odbijen — ${appointment.serviceName}`,
      rescheduled: `🔄 Predložen novi termin za ${appointment.serviceName}`,
      cancelled: `🚫 Termin otkazan — ${appointment.serviceName}`,
    };
    try {
      const notification = await createNotification({
        recipientProfileId: appointment.clientProfileId,
        tenantId: appointment.tenantId,
        type: fullType,
        title: config.clientTitle,
        message: config.clientMessage,
        appointmentId: appointment._id,
        metadata: {
          serviceName: appointment.serviceName,
          date: appointment.date,
          time: appointment.time,
        },
      });
      await sendWebPushToUser(appointment.clientProfileId, {
        title: salonName,
        body: pushBodyMap[type] ?? config.clientMessage,
        icon,
        tag: `appt-${type}-${appointment._id}`,
        url: panelUrl,
      });
      return notification;
    } catch (error) {
      console.error(`❌ Error creating client notification:`, error);
      throw error;
    }
  }
}

async function sendAppointmentEmailNotifications(
  appointment: AppointmentForNotification,
  type: AppointmentType,
  additionalData?: { sender?: "client" | "admin"; message?: string },
): Promise<void> {
  try {
    const appointmentData = {
      clientName: appointment.clientName,
      serviceName: appointment.serviceName,
      date: appointment.date || "Nije naveden",
      time: appointment.time || "Nije navedeno",
      appointmentId: appointment._id,
      tenantId: appointment.tenantId?.toString() ?? null,
      note: appointment.note,
      adminNote: additionalData?.message,
    };

    const settingKey = getAppointmentSettingKey(type);

    if (!isValidNotificationKey(settingKey)) {
      console.error(`Invalid setting key: ${settingKey}`);
      return;
    }

    // SCENARIO 1: ADMIN ŠALJE PORUKU KLIJENTU
    if (type === "message" && additionalData?.sender === "admin") {
      const clientSettings = await getTenantUserNotificationSettings(
        appointment.clientProfileId,
      );

      const shouldSendEmail =
        getSettingValue(clientSettings, "emailNotifications", true) === true &&
        getSettingValue(clientSettings, settingKey, true) === true;

      if (!shouldSendEmail) return;

      const clientEmail = await getTenantUserEmail(appointment.clientProfileId);
      if (!clientEmail) return;

      await sendAppointmentMessageNotification(clientEmail, {
        clientName: appointment.clientName,
        serviceName: appointment.serviceName,
        date: appointment.date,
        time: appointment.time,
        appointmentId: appointment._id,
        tenantId: appointment.tenantId?.toString() ?? null,
        senderName: "Salon",
        message: additionalData?.message || "",
        isAdminSender: true,
      });

      return;
    }

    // SCENARIO 2: KLIJENT ŠALJE PORUKU ADMINU
    if (type === "message" && additionalData?.sender === "client") {
      const adminUsers = await getAdminTenantUsersWithEmails(appointment.tenantId);

      for (const admin of adminUsers) {
        const shouldSendEmail =
          getSettingValue(admin.notificationSettings, "emailNotifications", true) === true &&
          getSettingValue(admin.notificationSettings, settingKey, true) === true;

        if (!shouldSendEmail) continue;

        await sendAppointmentMessageNotification(admin.email, {
          clientName: appointment.clientName,
          serviceName: appointment.serviceName,
          date: appointment.date,
          time: appointment.time,
          appointmentId: appointment._id,
          tenantId: appointment.tenantId?.toString() ?? null,
          senderName: appointment.clientName,
          message: additionalData?.message || "",
          isAdminSender: false,
        });
      }
      return;
    }

    // SCENARIO 3: NOVI TERMIN (klijent zakazuje)
    if (type === "created") {
      const adminUsers = await getAdminTenantUsersWithEmails(appointment.tenantId);

      for (const admin of adminUsers) {
        const shouldSendEmail =
          getSettingValue(admin.notificationSettings, "emailNotifications", true) === true &&
          getSettingValue(admin.notificationSettings, settingKey, true) === true;

        if (!shouldSendEmail) continue;

        await sendAppointmentNotification(admin.email, "created", appointmentData);
      }
      return;
    }

    // SCENARIO 4: PROMENA STATUSA (admin menja status → obavesti klijenta)
    if (
      type === "approved" ||
      type === "rejected" ||
      type === "rescheduled" ||
      type === "cancelled"
    ) {
      const clientSettings = await getTenantUserNotificationSettings(
        appointment.clientProfileId,
      );

      const shouldSendEmail =
        getSettingValue(clientSettings, "emailNotifications", true) === true &&
        getSettingValue(clientSettings, settingKey, true) === true;

      if (!shouldSendEmail) return;

      const clientEmail = await getTenantUserEmail(appointment.clientProfileId);
      if (!clientEmail) return;

      await sendAppointmentNotification(clientEmail, type, appointmentData);
    }
  } catch (error) {
    console.error("Error sending appointment email notifications:", error);
  }
}

export async function createTestimonialNotification(
  testimonial: TestimonialForNotification,
  type: TestimonialType,
  additionalData?: {
    oldComment?: string;
    deletedBy?: "admin" | "client";
    reason?: string;
  },
) {
  await sendTestimonialEmailNotifications(testimonial, type, additionalData);

  const notificationConfig = {
    created: {
      adminTitle: "Novi komentar",
      adminMessage: `Klijent ${testimonial.clientName} je ostavio komentar za ${testimonial.appointmentId.serviceName}`,
      clientTitle: "Komentar objavljen",
      clientMessage: `Vaš komentar za ${testimonial.appointmentId.serviceName} je uspešno objavljen`,
    },
    replied: {
      adminTitle: "Odgovor na komentar",
      adminMessage: `Odgovorili ste na komentar klijenta ${testimonial.clientName} za ${testimonial.appointmentId.serviceName}`,
      clientTitle: "Odgovor na komentar",
      clientMessage: `Admin je odgovorio na vaš komentar za ${testimonial.appointmentId.serviceName}`,
    },
    updated: {
      adminTitle: "Komentar ažuriran",
      adminMessage: `Klijent ${testimonial.clientName} je izmenio komentar za ${testimonial.appointmentId.serviceName}`,
      clientTitle: "Komentar ažuriran",
      clientMessage: `Vaš komentar za ${testimonial.appointmentId.serviceName} je uspešno ažuriran`,
    },
    deleted: {
      adminTitle: "Komentar izbrisan",
      adminMessage: `Klijent ${testimonial.clientName} je izbrisao komentar za ${testimonial.appointmentId.serviceName}`,
      clientTitle: "Komentar ažuriran",
      clientMessage: `Vaš komentar za ${testimonial.appointmentId.serviceName} je uspešno izbrisan`,
    },
    message: {
      adminTitle: "Nova poruka od klijenta",
      adminMessage: `Klijent ${testimonial.clientName} Vam je poslao poruku za termin: ${testimonial.appointmentId.serviceName}`,
      clientTitle: "Nova poruka od salona",
      clientMessage: `Salon Vam je poslao poruku za termin: ${testimonial.appointmentId.serviceName}`,
    },
  };

  const config = notificationConfig[type];

  const fullTypeMap = {
    created: "testimonial_created",
    replied: "testimonial_replied",
    updated: "testimonial_updated",
    deleted: "testimonial_deleted",
    message: "testimonial_message",
  } as const;

  const fullType = fullTypeMap[type];
  const { icon, name: salonName } = await getSalonBranding(testimonial.tenantId);
  const adminUrl = "/admin/preporuke";
  const panelUrl = "/panel?tab=Moje%20Preporuke";

  const stars = "⭐".repeat(Math.min(testimonial.rating ?? 5, 5));

  if (
    type === "created" ||
    type === "updated" ||
    type === "replied" ||
    type === "deleted" ||
    type === "message"
  ) {
    const adminIds = await getAllAdminTenantUserIds(testimonial.tenantId);
    const notifications = [];
    for (const adminId of adminIds) {
      const notification = await createNotification({
        recipientProfileId: adminId,
        tenantId: testimonial.tenantId,
        type: fullType,
        title: config.adminTitle,
        message: config.adminMessage,
        testimonialId: testimonial._id,
        metadata: {
          clientName: testimonial.clientName,
          serviceName: testimonial.appointmentId.serviceName,
          rating: testimonial.rating,
        },
      });
      notifications.push(notification);
    }

    const adminPushBodyMap: Partial<Record<TestimonialType, string>> = {
      created: `${stars} ${testimonial.clientName}: "${testimonial.comment?.substring(0, 60) || testimonial.appointmentId.serviceName}"`,
      updated: `✏️ ${testimonial.clientName} je izmenio/la recenziju za ${testimonial.appointmentId.serviceName}`,
      deleted: `🗑️ ${testimonial.clientName} je obrisao/la recenziju za ${testimonial.appointmentId.serviceName}`,
      message: `💬 ${testimonial.clientName}: nova poruka za ${testimonial.appointmentId.serviceName}`,
    };

    // Push to admins for client-originated events
    if (type !== "replied") {
      await sendWebPushToMany(adminIds, {
        title: salonName,
        body: adminPushBodyMap[type] ?? config.adminMessage,
        icon,
        tag: `testimonial-${type}-${testimonial._id}`,
        url: adminUrl,
      });
    }

    // Push to client when admin replies
    if (type === "replied") {
      await sendWebPushToUser(testimonial.clientProfileId, {
        title: salonName,
        body: `💬 Salon je odgovorio na Vašu recenziju za ${testimonial.appointmentId.serviceName}`,
        icon,
        tag: `testimonial-replied-${testimonial._id}`,
        url: panelUrl,
      });
    }

    return notifications;
  } else {
    const notification = await createNotification({
      recipientProfileId: testimonial.clientProfileId,
      tenantId: testimonial.tenantId,
      type: fullType,
      title: config.clientTitle,
      message: config.clientMessage,
      testimonialId: testimonial._id,
      metadata: {
        serviceName: testimonial.appointmentId.serviceName,
      },
    });
    await sendWebPushToUser(testimonial.clientProfileId, {
      title: salonName,
      body: config.clientMessage,
      icon,
      tag: `testimonial-${type}-${testimonial._id}`,
      url: panelUrl,
    });
    return notification;
  }
}

async function sendTestimonialEmailNotifications(
  testimonial: TestimonialForNotification,
  type: TestimonialType,
  additionalData?: {
    oldComment?: string;
    deletedBy?: "admin" | "client";
    reason?: string;
  },
): Promise<void> {
  try {
    const testimonialData = {
      clientName: testimonial.clientName,
      serviceName: testimonial.appointmentId.serviceName,
      rating: testimonial.rating,
      comment: testimonial.comment,
      adminReply: testimonial.adminReply,
    };

    const settingKey = getTestimonialSettingKey(type);

    if (!isValidNotificationKey(settingKey)) return;

    // SCENARIO 1: ADMIN ODGOVARA NA KOMENTAR
    if (type === "replied") {
      const clientSettings = await getTenantUserNotificationSettings(
        testimonial.clientProfileId,
      );

      const shouldSendEmail =
        getSettingValue(clientSettings, "emailNotifications", true) === true &&
        getSettingValue(clientSettings, settingKey, true) === true;

      if (!shouldSendEmail) return;

      const clientEmail = await getTenantUserEmail(testimonial.clientProfileId);
      if (clientEmail) {
        await sendTestimonialNotification(clientEmail, "replied", testimonialData);
      }
      return;
    }

    // SCENARIO 2: KLIJENT DODAJE/MENJA/BRISE KOMENTAR — obavesti admine
    const adminUsers = await getAdminTenantUsersWithEmails(testimonial.tenantId);

    for (const admin of adminUsers) {
      const shouldSendEmail =
        getSettingValue(admin.notificationSettings, "emailNotifications", true) === true &&
        getSettingValue(admin.notificationSettings, settingKey, true) === true;

      if (!shouldSendEmail) continue;

      let dataToSend = testimonialData;
      if (type === "updated" && additionalData?.oldComment) {
        dataToSend = {
          ...testimonialData,
          comment: `Stari komentar: ${additionalData.oldComment}\n\nNovi komentar: ${testimonialData.comment}`,
        };
      } else if (type === "deleted") {
        dataToSend = {
          ...testimonialData,
          comment: additionalData?.reason
            ? `Razlog brisanja: ${additionalData.reason}\n\nKomentar: ${testimonialData.comment}`
            : testimonialData.comment,
        };
      }

      await sendTestimonialNotification(admin.email, type, dataToSend);
    }
  } catch (error) {
    console.error("Error sending testimonial email notifications:", error);
  }
}

export async function createGenericNotification(
  tenantUserId: string,
  tenantId: string | Types.ObjectId,
  title: string,
  message: string,
  metadata?: Record<string, unknown>,
) {
  return await createNotification({
    recipientProfileId: tenantUserId,
    tenantId,
    type: "generic",
    title,
    message,
    metadata,
  });
}
