import "server-only";

// ─── Životni ciklus salona: obaveštenja ───────────────────────────────────────
//
// Isti tri kanala kao SuperAdmin↔Owner chat (zvonce + push + email), namerno
// ponovo upotrebljena umesto novog sistema. Razlika je u throttle-u: chat je
// čest pa se mejl guši, a ovi događaji su retki i vremenski osetljivi, pa idu
// uvek.
//
// Sve je u try/catch — obaveštenje NIKADA ne sme da sruši registraciju ni
// promenu statusa.

import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { Notification } from "@/models/Notification";
import { AuthUser } from "@/models/AuthUser";
import { sendWebPushToAuthUser } from "@/lib/webPush";
import { TenantUser } from "@/models/TenantUser";
import { Tenant } from "@/models/Tenant";
import { SuperAdminChat } from "@/models/SuperAdminChat";
import { notifyOwnersOfChatMessage } from "@/lib/superAdminChat/notify";
import {
  sendTenantRegisteredNotification,
  sendSalonActivatedNotification,
} from "@/lib/email/email";

import { platformOrigin, tenantOrigin } from "@/lib/platform/host-context";
import { SUPERADMIN_PATH } from "@/lib/notifications/pushTargets";

function deliverableEmails(emails: (string | undefined | null)[]): string[] {
  return [...new Set(emails.filter((e): e is string => Boolean(e?.includes("@"))))];
}

/**
 * Nov salon je registrovan i čeka aktivaciju javnog sajta.
 *
 * Bez ovoga superadmin nema nijedan signal da neko čeka — vlasnica sedi u
 * panelu bez javnog sajta, a niko iz tima ne zna ni da je došla ni koliko čeka.
 */
export async function notifySuperAdminsOfTenantRegistration(params: {
  tenantId: string | Types.ObjectId;
  salonName: string;
  ownerName: string;
  ownerEmail: string;
  subdomain: string;
}): Promise<void> {
  try {
    await connectToDB();

    const superadmins = (await AuthUser.find({ platformRole: "SUPER_ADMIN" })
      .select("_id email")
      .lean()) as { _id: Types.ObjectId; email?: string }[];

    if (!superadmins.length) return;

    const body = `${params.ownerName} — čeka aktivaciju sajta`;

    // 1) Zvonce — po jedan po superadminu (recipientProfileId = AuthUser._id).
    await Promise.allSettled(
      superadmins.map((sa) =>
        Notification.create({
          recipientProfileId: sa._id,
          tenantId: params.tenantId,
          type: "tenant_registered",
          title: `🆕 Nov salon: ${params.salonName}`,
          message: body,
          isRead: false,
          metadata: {
            salonName: params.salonName,
            ownerName: params.ownerName,
            ownerEmail: params.ownerEmail,
            subdomain: params.subdomain,
          },
        }),
      ),
    );

    // 2) Push.
    await Promise.allSettled(
      superadmins.map((sa) =>
        sendWebPushToAuthUser(sa._id, {
          title: `🆕 Nov salon: ${params.salonName}`,
          body,
          tag: `tenant-registered-${params.tenantId.toString()}`,
          url: SUPERADMIN_PATH,
        }),
      ),
    );

    // 3) Email — BEZ throttle-a, vidi belešku na vrhu fajla.
    const emails = deliverableEmails(superadmins.map((s) => s.email));
    if (emails.length) {
      await sendTenantRegisteredNotification(emails, {
        salonName: params.salonName,
        ownerName: params.ownerName,
        ownerEmail: params.ownerEmail,
        subdomain: params.subdomain,
        url: `${platformOrigin()}${SUPERADMIN_PATH}`,
      });
    }
  } catch (error) {
    console.error("⚠️ Obaveštenje o registraciji salona nije poslato:", error);
  }
}

/**
 * Javni sajt salona je upravo aktiviran.
 *
 * Vlasnica dobija mejl + poruku u POSTOJEĆEM SuperAdmin↔Owner chatu. Chat je
 * biran namerno: `notifyOwnersOfChatMessage` već nosi zvonce i push, poruka
 * ostaje u istoriji razgovora i vlasnica može odmah da odgovori. Nema nove
 * cevi za obaveštenja i nema novog `Notification.type`.
 */
export async function notifyOwnerOfSalonActivation(params: {
  tenantId: string | Types.ObjectId;
}): Promise<void> {
  try {
    await connectToDB();
    const tenantIdStr = params.tenantId.toString();

    const tenant = (await Tenant.findById(tenantIdStr)
      .select("name slug subdomain customDomain customDomainVerified")
      .lean()) as {
      name?: string;
      slug?: string;
      subdomain?: string;
      customDomain?: string | null;
      customDomainVerified?: boolean;
    } | null;
    if (!tenant) return;

    const salonName = tenant.name || tenant.slug || "Vaš salon";
    const siteUrl = tenantOrigin({
      slug: tenant.slug ?? tenant.subdomain ?? "",
      customDomain: tenant.customDomain ?? null,
      customDomainVerified: tenant.customDomainVerified ?? false,
    });

    const poruka =
      `Sajt vašeg salona je aktivan i vidljiv posetiocima: ${siteUrl}\n\n` +
      `Izgled menjate u panelu, u delu za temu i sadržaj. Ako nešto ne izgleda ` +
      `kako očekujete, odgovorite ovde — tu smo.`;

    // 1) Poruka u chat → zvonce + push + email kroz postojeći kanal.
    let chat = await SuperAdminChat.findOne({ tenantId: tenantIdStr });
    const owner = (await TenantUser.findOne({
      tenantId: tenantIdStr,
      role: "OWNER",
    })
      .select("_id email name")
      .lean()) as { _id: Types.ObjectId; email?: string; name?: string } | null;

    if (!chat) {
      chat = new SuperAdminChat({
        tenantId: tenantIdStr,
        ownerId: owner?._id,
        messages: [],
        unreadBySuperAdmin: 0,
        unreadByOwner: 0,
        lastMessageAt: new Date(),
      });
    }
    chat.messages.push({
      senderId: owner?._id,
      senderRole: "superadmin",
      message: poruka,
      attachments: [],
      isDeleted: false,
      isRead: false,
      timestamp: new Date(),
    } as Parameters<typeof chat.messages.push>[0]);
    chat.unreadByOwner += 1;
    chat.lastMessageAt = new Date();
    await chat.save();

    await notifyOwnersOfChatMessage({
      tenantId: tenantIdStr,
      content: poruka,
      hasAttachment: false,
    });

    // 2) Zaseban mejl — chat mejl je throttle-ovan, a ovo je događaj koji
    //    vlasnica ne sme da propusti.
    if (owner?.email?.includes("@")) {
      await sendSalonActivatedNotification(owner.email, {
        salonName,
        siteUrl,
        dashboardUrl: `${platformOrigin()}/dashboard`,
      });
    }
  } catch (error) {
    console.error("⚠️ Obaveštenje o aktivaciji salona nije poslato:", error);
  }
}
