import "server-only";

// ─── Growth Studio: dvostepeni auto-complete ──────────────────────────────────
// Korak 1 (T + promptAfterHours posle kraja termina): adminu se šalje prompt
//   "Termin nije označen — Završen / No-show / Otkazan".
// Korak 2 (T + autoAfterHours, samo ako je prompt već poslat): atomic claim
//   approved → completed (completionSource: "auto") → loyalty event.
// Admin i dalje može da prebaci na no_show — revert putanja sređuje poene.

import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { LoyaltyConfig } from "@/models/LoyaltyConfig";
import { tenantHasFeature } from "@/lib/plans/subscriptionService";
import { appointmentEndUTC, belgradeDateStr } from "@/lib/utils/belgradeTime";
import { completeAppointmentCheckout } from "@/lib/appointments/checkout";
import { notifyAdminsCompletionPrompt } from "../notifications";

interface AutoCompleteConfig {
  tenantId: Types.ObjectId;
  autoComplete: {
    enabled: boolean;
    promptAfterHours: number;
    autoAfterHours: number;
  };
}

interface PendingAppointment {
  _id: Types.ObjectId;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  duration: number;
  completionPromptSentAt?: Date;
}

export async function runAutoComplete(): Promise<{
  prompted: number;
  completed: number;
}> {
  await connectToDB();

  const configs = (await LoyaltyConfig.find({
    enabled: true,
    "autoComplete.enabled": true,
  })
    .select("tenantId autoComplete")
    .lean()) as unknown as AutoCompleteConfig[];

  let prompted = 0;
  let completed = 0;
  const now = new Date();
  const today = belgradeDateStr(now);

  for (const cfg of configs) {
    try {
      // Plan je mogao da se degradira posle uključivanja programa.
      const allowed = await tenantHasFeature(
        cfg.tenantId.toString(),
        "loyaltyCore",
      );
      if (!allowed) continue;

      const appointments = (await Appointment.find({
        tenantId: cfg.tenantId,
        status: "appointment_approved",
        date: { $lte: today },
      })
        .select("clientName serviceName date time duration completionPromptSentAt")
        .lean()) as unknown as PendingAppointment[];

      for (const appt of appointments) {
        const end = appointmentEndUTC(appt.date, appt.time, appt.duration);
        const hoursSinceEnd = (now.getTime() - end.getTime()) / 3_600_000;
        if (hoursSinceEnd < cfg.autoComplete.promptAfterHours) continue;

        // Korak 2: auto-complete — tek pošto je admin dobio prompt.
        if (
          appt.completionPromptSentAt &&
          hoursSinceEnd >= cfg.autoComplete.autoAfterHours
        ) {
          // Isti canonical seam kao ručni checkout — ista pravila obračuna i
          // isti atomic prelaz. Bez iznosa: mašina ne izmišlja cenu koju
          // čovek nije rekao, pa termin bez cene ostaje bez cene.
          //
          // Termin sa pogodnošću a bez potvrđene pre-benefit cene seam ODBIJA
          // (`INVALID`). To je namerno: auto-complete ne sme ni da izmisli
          // cenu ni da skine pogodnost, pa takav termin ostaje vlasnici da ga
          // sama zatvori kroz Checkout.
          try {
            const result = await completeAppointmentCheckout({
              appointmentId: appt._id.toString(),
              actor: { tenantId: cfg.tenantId.toString() },
              source: "auto",
              expectedFromStatus: "appointment_approved",
            });
            if (!result.alreadyCompleted) completed++;
          } catch (err) {
            // Ni trka sa adminom ni „traži se dogovorena cena" nisu greške
            // crona — sledeći prolaz vidi novo stanje.
            console.warn(
              `[loyalty] auto-complete preskočen ${appt._id}:`,
              err instanceof Error ? err.message : err,
            );
          }
          continue;
        }

        // Korak 1: prompt adminu (jednom po terminu — atomic claim).
        if (!appt.completionPromptSentAt) {
          const claimed = await Appointment.findOneAndUpdate(
            {
              _id: appt._id,
              status: "appointment_approved",
              completionPromptSentAt: null,
            },
            { $set: { completionPromptSentAt: now } },
          ).lean();
          if (!claimed) continue;
          await notifyAdminsCompletionPrompt({
            tenantId: cfg.tenantId,
            appointmentId: appt._id,
            clientName: appt.clientName,
            serviceName: appt.serviceName,
            date: appt.date,
            time: appt.time,
          });
          prompted++;
        }
      }
    } catch (err) {
      console.error(
        `[loyalty] auto-complete failed for tenant ${cfg.tenantId}:`,
        err,
      );
    }
  }

  return { prompted, completed };
}
