import "server-only";

// appointment.client.invalid (ERROR) — Appointment.clientProfileId pokazuje na
// nepostojećeg/spojenog/suspendovanog korisnika: klijent ne vidi termin, admin
// vidi pogrešnog, completion ne dodeljuje srca pravom nalogu. Iz tenant-scoped
// perspektive "nepostojeći" pokriva i pogrešan tenant.

import { Appointment } from "@/models/Appointment";
import { makeFinding } from "@/lib/platform/diagnostic-client";
import type { IntegrityFinding } from "@/lib/platform/diagnostic-client";
import { classifyUserRef, refIssueLabel } from "../classify";
import type { CollectorContext, CollectorOutput } from "./types";

const KEY = "appointment.client.invalid";

export async function collectAppointmentClient(
  ctx: CollectorContext,
): Promise<CollectorOutput> {
  const index = await ctx.loaders.index();

  const appointments = await Appointment.find({ tenantId: ctx.tenantId })
    .select("clientProfileId date time status")
    .lean();

  const findings: IntegrityFinding[] = [];

  for (const raw of appointments as Record<string, unknown>[]) {
    if (!raw.clientProfileId) continue;
    const clientId = String(raw.clientProfileId);
    const issue = classifyUserRef(clientId, index);
    if (!issue) continue;
    const user = index.get(clientId);
    findings.push(
      makeFinding({
        checkKey: KEY,
        severity: "error",
        subject: { model: "Appointment", id: String(raw._id) },
        message: `Termin ${raw.date} ${raw.time} pokazuje na klijenta ${clientId}: ${refIssueLabel(issue)}.`,
        evidence: {
          clientProfileId: clientId,
          date: String(raw.date ?? ""),
          time: String(raw.time ?? ""),
          status: String(raw.status ?? ""),
          issue,
          ...(user?.mergedInto && { expectedProfile: user.mergedInto }),
        },
        repair:
          issue === "merged"
            ? {
                action: "reassign_to_canonical",
                params: { targetId: user!.mergedInto! },
              }
            : { action: "manual_investigation" },
      }),
    );
  }

  return { findings, scanned: appointments.length };
}
