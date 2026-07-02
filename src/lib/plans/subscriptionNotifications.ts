import "server-only";
/**
 * lib/plans/subscriptionNotifications.ts
 *
 * Obaveštenja vlasniku salona o promenama pretplate (Paddle webhook).
 * In-app notifikacija ide svim OWNER/ADMIN profilima, email vlasniku
 * (AuthUser preko Tenant.ownerId). Best-effort — greška se loguje, ne baca.
 */

import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { AuthUser } from "@/models/AuthUser";
import { createGenericNotification } from "@/lib/notificationService";
import { sendEmail } from "@/lib/email/email";
import { wrapEmailLayout } from "@/lib/email/wrapEmailLayout";
import { PLAN_DISPLAY_NAMES } from "./planFeatures";
import type { PlanName } from "./planFeatures";

export async function notifySubscriptionCancelled(params: {
  tenantId: string;
  tenantName: string;
  ownerId: Types.ObjectId | string | null | undefined;
  previousPlan: PlanName;
  effectiveEnd: Date;
}): Promise<void> {
  const { tenantId, tenantName, ownerId, previousPlan, effectiveEnd } = params;
  const planLabel = PLAN_DISPLAY_NAMES[previousPlan] ?? previousPlan;
  const dateLabel = effectiveEnd.toLocaleDateString("sr-RS", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const title = "Pretplata je otkazana";
  const message =
    `Pretplata na ${planLabel} plan za salon "${tenantName}" je otkazana (${dateLabel}). ` +
    `Salon je prebačen na besplatni Maria plan — sajt i zakazivanje rade i dalje, ` +
    `ali funkcionalnosti plaćenog plana više nisu dostupne.`;

  await connectToDB();

  // ── In-app notifikacije za OWNER/ADMIN profile ────────────────────────────
  try {
    const admins = await TenantUser.find({
      tenantId,
      role: { $in: ["OWNER", "ADMIN"] },
    })
      .select("_id")
      .lean<{ _id: Types.ObjectId }[]>();

    await Promise.all(
      admins.map((a) =>
        createGenericNotification(a._id.toString(), tenantId, title, message, {
          kind: "subscription_cancelled",
          previousPlan,
        }).catch((e) =>
          console.error("[subscription] in-app notifikacija nije poslata:", e),
        ),
      ),
    );
  } catch (e) {
    console.error("[subscription] greška pri slanju in-app notifikacija:", e);
  }

  // ── Email vlasniku (platformski branding) ─────────────────────────────────
  try {
    const owner = ownerId
      ? await AuthUser.findById(ownerId).select("email").lean<{
          email?: string;
        }>()
      : null;
    if (!owner?.email) {
      console.warn(
        `[subscription] nema email vlasnika za tenant ${tenantId} — email preskočen`,
      );
      return;
    }

    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://marysoll.com"}/dashboard`;
    const html = await wrapEmailLayout({
      title,
      content: `
        <p style="margin:0 0 16px 0;">Poštovani,</p>
        <p style="margin:0 0 16px 0;">
          Vaša pretplata na <strong>${planLabel}</strong> plan za salon
          <strong>${tenantName}</strong> je otkazana <strong>${dateLabel}</strong>.
        </p>
        <p style="margin:0 0 16px 0;">
          Salon je automatski prebačen na besplatni <strong>Maria</strong> plan —
          vaš sajt i online zakazivanje nastavljaju da rade bez prekida, ali
          funkcionalnosti plaćenog plana (statistika, kampanje, AI alati,
          Growth Studio) više nisu dostupne.
        </p>
        <p style="margin:0 0 24px 0;">
          Plan možete ponovo aktivirati u svakom trenutku iz dashboard-a.
        </p>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center">
          <tr>
            <td style="border-radius:10px;background:linear-gradient(135deg,#ff80b5,#9089fc);">
              <a href="${dashboardUrl}"
                style="display:inline-block;padding:12px 28px;font-family:'Georgia',serif;font-size:14px;font-weight:700;color:#ffffff;">
                Otvori dashboard
              </a>
            </td>
          </tr>
        </table>
      `,
    });

    await sendEmail({
      to: owner.email,
      subject: `Pretplata otkazana — salon "${tenantName}" je na Maria planu`,
      html,
    });
  } catch (e) {
    console.error("[subscription] email o otkazivanju nije poslat:", e);
  }
}
