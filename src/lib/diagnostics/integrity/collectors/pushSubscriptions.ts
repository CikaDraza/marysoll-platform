import "server-only";

// notifications.push.subscriptions — ko je pretplaćen na push notifikacije:
//  INFO: aktivan nalog (admin ili klijent) sa >=1 registrovanom pretplatom —
//    broj uređaja + poslednja registracija (evidence za "je li ovo pravi
//    klijent ili neko ko je testirao na drugom domenu/uređaju").
//  WARNING: admin/staff nalog ima push UKLJUČEN u podešavanjima, ali nema
//    nijednu pretplatu — tiho ne prima notifikacije iako misli da prima.
// Suspendovani/spojeni nalozi se preskaču (mergedInto=null filter u upitu).

import { TenantUser } from "@/models/TenantUser";
import { makeFinding } from "@/lib/platform/diagnostic-client";
import type { IntegrityFinding } from "@/lib/platform/diagnostic-client";
import type { CollectorContext, CollectorOutput } from "./types";

const KEY = "notifications.push.subscriptions";
const ADMIN_ROLES = new Set(["OWNER", "ADMIN", "STAFF"]);

interface PushSubRow {
  _id: unknown;
  name?: string;
  email?: string;
  role?: string;
  pushSubscriptions?: { createdAt?: Date }[];
  notificationSettings?: { pushNotifications?: boolean };
}

export async function collectPushSubscriptions(
  ctx: CollectorContext,
): Promise<CollectorOutput> {
  const rows = (await TenantUser.find({
    tenantId: ctx.tenantId,
    status: { $ne: "suspended" },
    mergedInto: null,
  })
    .select("name email role pushSubscriptions notificationSettings.pushNotifications")
    .lean()) as PushSubRow[];

  const findings: IntegrityFinding[] = [];

  for (const row of rows) {
    const userId = String(row._id);
    const name = row.name ?? "";
    const email = row.email ?? "";
    const role = row.role ?? "";
    const subs = row.pushSubscriptions ?? [];
    const pushEnabled = row.notificationSettings?.pushNotifications !== false;

    if (subs.length === 0) {
      if (ADMIN_ROLES.has(role) && pushEnabled) {
        findings.push(
          makeFinding({
            checkKey: KEY,
            severity: "warning",
            subject: { model: "TenantUser", id: userId },
            message: `${name} (${role}): push je uključen u podešavanjima, ali nema nijednu registrovanu pretplatu — ne prima push notifikacije.`,
            evidence: { name, email, role },
            repair: { action: "manual_investigation" },
          }),
        );
      }
      continue;
    }

    const timestamps = subs
      .map((s) => (s.createdAt ? new Date(s.createdAt).getTime() : null))
      .filter((t): t is number => t !== null)
      .sort((a, b) => a - b);
    const lastAt = timestamps.length ? new Date(timestamps[timestamps.length - 1]) : null;

    findings.push(
      makeFinding({
        checkKey: KEY,
        severity: "info",
        subject: { model: "TenantUser", id: userId },
        message: `${name} (${role}, ${email}): ${subs.length} aktivn${subs.length === 1 ? "a" : "ih"} push pretplat${subs.length === 1 ? "a" : "e"}${lastAt ? `, poslednja registrovana ${lastAt.toLocaleDateString("sr-RS")}` : ""}.`,
        evidence: {
          name,
          email,
          role,
          subscriptionCount: subs.length,
          firstSubscribedAt: timestamps.length ? new Date(timestamps[0]).toISOString() : null,
          lastSubscribedAt: lastAt ? lastAt.toISOString() : null,
        },
      }),
    );
  }

  // warning (anomalija) pre info (spisak) — cap ne sme da istisne anomalije
  findings.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "warning" ? -1 : 1));

  return { findings, scanned: rows.length };
}
