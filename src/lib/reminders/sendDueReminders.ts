import "server-only";

// Podsetnici za termine — 1 sat i 30 minuta pre početka.
// Šalje push (gejtovano `appointmentReminder`/`pushNotifications`) + kreira
// in-app notifikaciju, i klijentu i adminima salona. Dedupe preko atomic claim-a.

import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { TenantUser } from "@/models/TenantUser";
import { createNotification, getSalonBranding } from "@/lib/notificationService";
import { sendWebPushToUser } from "@/lib/webPush";
import { Types } from "mongoose";
import { belgradeDateStr, belgradeToUTC } from "@/lib/utils/belgradeTime";

interface ReminderAppointment {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  clientProfileId: Types.ObjectId;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  reminderSent?: { h1?: boolean; m30?: boolean };
}

async function getAdminIds(tenantId: Types.ObjectId): Promise<string[]> {
  const admins = (await TenantUser.find({
    tenantId,
    role: { $in: ["OWNER", "ADMIN"] },
  })
    .select("_id")
    .lean()) as { _id: Types.ObjectId }[];
  return admins.map((a) => a._id.toString());
}

export async function sendDueReminders(): Promise<{
  scanned: number;
  sent: number;
  skipped?: boolean;
}> {
  await connectToDB();

  const now = new Date();
  const today = belgradeDateStr(now);
  const tomorrow = belgradeDateStr(new Date(now.getTime() + 24 * 3_600_000));

  // Brzi izlaz: ako nema nijednog odobrenog termina od danas pa nadalje,
  // ne radi dalji posao (cron praktično "ne radi" kad nema zakazanih termina).
  const hasUpcoming = await Appointment.exists({
    status: "appointment_approved",
    date: { $gte: today },
  });
  if (!hasUpcoming) {
    return { scanned: 0, sent: 0, skipped: true };
  }

  const appointments = (await Appointment.find({
    status: "appointment_approved",
    date: { $in: [today, tomorrow] },
    $or: [
      { "reminderSent.h1": { $ne: true } },
      { "reminderSent.m30": { $ne: true } },
    ],
  })
    .select(
      "tenantId clientProfileId clientName serviceName date time reminderSent",
    )
    .lean()) as unknown as ReminderAppointment[];

  let sent = 0;

  for (const appt of appointments) {
    const start = belgradeToUTC(appt.date, appt.time);
    const remainingMin = (start.getTime() - now.getTime()) / 60_000;
    if (remainingMin <= 0) continue;

    // Koji podsetnik je na redu?
    let bucket: "h1" | "m30" | null = null;
    if (remainingMin <= 60 && remainingMin > 30 && !appt.reminderSent?.h1) {
      bucket = "h1";
    } else if (remainingMin <= 30 && !appt.reminderSent?.m30) {
      bucket = "m30";
    }
    if (!bucket) continue;

    // Atomic claim — sprečava dupli push pri preklapanju cron poziva.
    const claimed = await Appointment.findOneAndUpdate(
      { _id: appt._id, [`reminderSent.${bucket}`]: { $ne: true } },
      { $set: { [`reminderSent.${bucket}`]: true } },
    ).lean();
    if (!claimed) continue;

    // Ikona = SAMO notificationLogo (raster) → Marysoll default; tenant `logo`
    // se NE koristi jer može biti SVG koji web push renderuje kao uzvičnik.
    const { icon, name: salonName } = await getSalonBranding(appt.tenantId);
    const mins = Math.round(remainingMin);

    // ── Klijent ──
    const clientBody = `⏰ Podsetnik: ${appt.serviceName} danas u ${appt.time} (za ~${mins} min)`;
    try {
      await createNotification({
        recipientProfileId: appt.clientProfileId,
        tenantId: appt.tenantId,
        type: "appointment_reminder",
        title: salonName,
        message: clientBody,
        appointmentId: appt._id,
        metadata: { serviceName: appt.serviceName, time: appt.time, bucket },
      });
    } catch (e) {
      console.error("[reminders] client in-app failed:", e);
    }
    await sendWebPushToUser(
      appt.clientProfileId.toString(),
      {
        title: salonName,
        body: clientBody,
        icon,
        tag: `appt-reminder-${bucket}-${appt._id}`,
        url: "/panel?tab=Moji%20Termini",
      },
      { requireSettings: ["appointmentReminder"] },
    );

    // ── Admini salona ──
    const adminIds = await getAdminIds(appt.tenantId);
    const adminBody = `⏰ Podsetnik: ${appt.clientName} — ${appt.serviceName} u ${appt.time} (za ~${mins} min)`;
    for (const adminId of adminIds) {
      try {
        await createNotification({
          recipientProfileId: adminId,
          tenantId: appt.tenantId,
          type: "appointment_reminder",
          title: salonName,
          message: adminBody,
          appointmentId: appt._id,
          metadata: {
            clientName: appt.clientName,
            serviceName: appt.serviceName,
            time: appt.time,
            bucket,
          },
        });
      } catch (e) {
        console.error("[reminders] admin in-app failed:", e);
      }
    }
    await Promise.allSettled(
      adminIds.map((id) =>
        sendWebPushToUser(
          id,
          {
            title: salonName,
            body: adminBody,
            icon,
            tag: `appt-reminder-${bucket}-${appt._id}`,
            url: "/admin/termini",
          },
          { requireSettings: ["appointmentReminder"] },
        ),
      ),
    );

    sent++;
  }

  return { scanned: appointments.length, sent };
}
