import "server-only";

// lib/notificationService.ts
import { Notification } from "@/models/Notification";
import { connectToDB } from "@/lib/db/mongodb";
import { INotification, UserNotificationSettings } from "@/types";
import { Types } from "mongoose";
import { User } from "@/models/User";
import {
  sendAppointmentMessageNotification,
  sendAppointmentNotification,
  sendTestimonialNotification,
} from "./email/email";

interface CreateNotificationParams {
  userId: string | Types.ObjectId;
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
    const notificationData = {
      ...params,
      tenantId:
        typeof params.tenantId === "string"
          ? new Types.ObjectId(params.tenantId)
          : params.tenantId,
      userId:
        typeof params.userId === "string"
          ? new Types.ObjectId(params.userId)
          : params.userId,
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
    };

    const notification = new Notification(notificationData);
    await notification.save();
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

// Funkcija za dobijanje SVIH admin user ID-jeva
async function getAllAdminUserIds(): Promise<string[]> {
  await connectToDB();

  try {
    const adminUsers = await User.find({ isAdmin: true });
    return adminUsers.map((user) => user._id.toString());
  } catch (error) {
    console.error("Error getting admin users:", error);
    return [];
  }
}

// Definiši tipove za appointment i testimonial
interface AppointmentForNotification {
  _id: string;
  tenantId: Types.ObjectId | string;
  clientId: string;
  clientName: string;
  serviceName: string;
  date?: string;
  time?: string;
  note?: string;
}

interface TestimonialForNotification {
  _id: string;
  tenantId: Types.ObjectId | string;
  clientId: string;
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

// Utility funkcija za type-safe pristup settings
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

// Type guard za proveru validnosti key-a
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

// Helper funkcija za type-safe pristup settings
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

// Specifične funkcije za različite tipove notifikacija
export async function createAppointmentNotification(
  appointment: AppointmentForNotification,
  type: AppointmentType, // Ovo je "approved", "rejected", itd.
  additionalData?: { sender?: "client" | "admin"; message?: string },
) {
  // Prvo pošalji email notifikacije
  await sendAppointmentEmailNotifications(appointment, type, additionalData);

  // Mapiraj kratke tipove na pune tipove za bazu
  const fullTypeMap = {
    created: "appointment_created",
    approved: "appointment_approved", // ✅
    rejected: "appointment_rejected", // ✅
    rescheduled: "appointment_rescheduled", // ✅
    cancelled: "appointment_cancelled", // ✅
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

  // Za poruke - različita logika za admina i klijenta
  if (type === "message") {
    if (additionalData?.sender === "client") {
      // Klijent šalje poruku - obavesti SVE admine
      const adminUserIds = await getAllAdminUserIds();

      const notifications = [];
      for (const adminId of adminUserIds) {
        const notification = await createNotification({
          userId: adminId,
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
      return notifications;
    } else {
      // Admin šalje poruku - obavesti klijenta
      return await createNotification({
        userId: appointment.clientId,
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
    }
  }

  // Za ostale tipove notifikacija
  if (type === "created") {
    // Novi termin - obavesti SVE admine
    const adminUserIds = await getAllAdminUserIds();

    const notifications = [];
    for (const adminId of adminUserIds) {
      const notification = await createNotification({
        userId: adminId,
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

    return notifications;
  } else {
    // Ostali statusi (approved, rejected, rescheduled, cancelled) - obavesti klijenta
    try {
      const notification = await createNotification({
        userId: appointment.clientId,
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
      return notification;
    } catch (error) {
      console.error(`❌ Error creating client notification:`, error);
      throw error;
    }
  }
}

async function getUserNotificationSettings(
  userId: string,
): Promise<UserNotificationSettings | null> {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    return (user.notificationSettings as UserNotificationSettings) || null;
  } catch (error) {
    console.error("Error getting user notification settings:", error);
    return null;
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
      note: appointment.note,
      adminNote: additionalData?.message,
    };

    // TYPE-SAFE: Dobij setting key
    const settingKey = getAppointmentSettingKey(type);

    // Proveri da li je validan key
    if (!isValidNotificationKey(settingKey)) {
      console.error(`Invalid setting key: ${settingKey}`);
      return;
    }

    // ✅ SCENARIO 1: ADMIN ŠALJE PORUKU KLIJENTU
    if (type === "message" && additionalData?.sender === "admin") {
      const clientSettings = await getUserNotificationSettings(
        appointment.clientId,
      );

      const shouldSendEmail =
        getSettingValue(clientSettings, "emailNotifications", true) === true &&
        getSettingValue(clientSettings, settingKey, true) === true;

      if (!shouldSendEmail) {
        return;
      }

      const client = await User.findById(appointment.clientId);
      if (!client?.email) {
        return;
      }

      await sendAppointmentMessageNotification(client.email, {
        clientName: appointment.clientName,
        serviceName: appointment.serviceName,
        date: appointment.date,
        time: appointment.time,
        appointmentId: appointment._id,
        senderName: "Marysoll Makeup Salon",
        message: additionalData?.message || "",
        isAdminSender: true,
      });

      return;
    }

    // ✅ SCENARIO 2: KLIJENT ŠALJE PORUKU ADMINU
    if (type === "message" && additionalData?.sender === "client") {
      // Dohvati SVE admine i proveri postavke za SVAKOG
      const adminUsers = await User.find({ isAdmin: true });

      for (const admin of adminUsers) {
        const adminSettings = await getUserNotificationSettings(
          admin._id.toString(),
        );

        const shouldSendEmail =
          getSettingValue(adminSettings, "emailNotifications", true) === true &&
          getSettingValue(adminSettings, settingKey, true) === true;

        if (!shouldSendEmail || !admin.email) {
          continue;
        }

        await sendAppointmentMessageNotification(admin.email, {
          clientName: appointment.clientName,
          serviceName: appointment.serviceName,
          date: appointment.date,
          time: appointment.time,
          appointmentId: appointment._id,
          senderName: appointment.clientName,
          message: additionalData?.message || "",
          isAdminSender: false,
        });
      }

      return;
    }

    // ✅ SCENARIO 3: NOVI TERMIN (klijent zakazuje)
    if (type === "created") {
      // Dohvati SVE admine i proveri postavke za SVAKOG
      const adminUsers = await User.find({ isAdmin: true });

      for (const admin of adminUsers) {
        const adminSettings = await getUserNotificationSettings(
          admin._id.toString(),
        );

        const shouldSendEmail =
          getSettingValue(adminSettings, "emailNotifications", true) === true &&
          getSettingValue(adminSettings, settingKey, true) === true;

        if (!shouldSendEmail || !admin.email) {
          continue;
        }

        await sendAppointmentNotification(
          admin.email,
          "created",
          appointmentData,
        );
      }

      return;
    }

    // ✅ SCENARIO 4: PROMENA STATUSA TERMINA (admin menja status)
    if (
      type === "approved" ||
      type === "rejected" ||
      type === "rescheduled" ||
      type === "cancelled"
    ) {
      const clientSettings = await getUserNotificationSettings(
        appointment.clientId,
      );

      const shouldSendEmail =
        getSettingValue(clientSettings, "emailNotifications", true) === true &&
        getSettingValue(clientSettings, settingKey, true) === true;

      if (!shouldSendEmail) {
        return;
      }

      const client = await User.findById(appointment.clientId);
      if (!client?.email) {
        return;
      }

      await sendAppointmentNotification(client.email, type, appointmentData);
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

  // Mapiranje kratke tipove na pune tipove za bazu
  const fullTypeMap = {
    created: "testimonial_created",
    replied: "testimonial_replied",
    updated: "testimonial_updated",
    deleted: "testimonial_deleted",
    message: "testimonial_message",
  } as const;

  const fullType = fullTypeMap[type];

  if (
    type === "created" ||
    type === "updated" ||
    type === "replied" ||
    type === "deleted" ||
    type === "message"
  ) {
    // Novi ili ažurirani komentar - obavesti SVE admine
    const adminUserIds = await getAllAdminUserIds();

    const notifications = [];
    for (const adminId of adminUserIds) {
      const notification = await createNotification({
        userId: adminId,
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
    return notifications;
  } else {
    // Odgovor na komentar - obavesti klijenta
    return await createNotification({
      userId: testimonial.clientId,
      tenantId: testimonial.tenantId,
      type: fullType,
      title: config.clientTitle,
      message: config.clientMessage,
      testimonialId: testimonial._id,
      metadata: {
        serviceName: testimonial.appointmentId.serviceName,
      },
    });
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

    if (!isValidNotificationKey(settingKey)) {
      return;
    }

    // ✅ SCENARIO 1: ADMIN ODGOVARA NA KOMENTAR
    if (type === "replied") {
      const clientSettings = await getUserNotificationSettings(
        testimonial.clientId,
      );

      const shouldSendEmail =
        getSettingValue(clientSettings, "emailNotifications", true) === true &&
        getSettingValue(clientSettings, settingKey, true) === true;

      if (!shouldSendEmail) {
        return;
      }

      const client = await User.findById(testimonial.clientId);
      if (client?.email) {
        await sendTestimonialNotification(
          client.email,
          "replied",
          testimonialData,
        );
      }

      return;
    }

    // ✅ SCENARIO 2: KLIJENT DODAJE/MENJA/BRISE KOMENTAR
    // Obavesti SVE admine koji žele notifikacije
    const adminUsers = await User.find({ isAdmin: true });

    for (const admin of adminUsers) {
      const adminSettings = await getUserNotificationSettings(
        admin._id.toString(),
      );

      const shouldSendEmail =
        getSettingValue(adminSettings, "emailNotifications", true) === true &&
        getSettingValue(adminSettings, settingKey, true) === true;

      if (!shouldSendEmail || !admin.email) {
        continue;
      }

      // Prilagodi podatke za specifične tipove
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

// Funkcija za kreiranje generičke notifikacije
export async function createGenericNotification(
  userId: string,
  tenantId: string | Types.ObjectId,
  title: string,
  message: string,
  metadata?: Record<string, unknown>,
) {
  return await createNotification({
    userId,
    tenantId, // Generic notifikacije nisu vezane za tenant
    type: "generic",
    title,
    message,
    metadata,
  });
}
