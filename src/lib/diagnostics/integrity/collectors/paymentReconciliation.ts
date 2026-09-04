import "server-only";

// payment.appointment.overpaid — usaglašavanje novca i vrednosti termina.
//
// Tvrdi invariant domena: `chargedAmount` (koliko je termin VREDEO) ne sme biti
// manji od neto novca koji je za taj termin prošao KROZ PLATFORMU. Kršenje
// hvata: vlasnica ukucala manji iznos nego što je klijentkinja platila online,
// povraćaj koji nije upisan u ledger, i depozit koji niko nije uračunao.
//
// Provera se pokreće nad ZAVRŠENIM terminima: dok termin traje, uplaćen depozit
// legitimno premašuje `chargedAmount` koji još ne postoji.

import { Appointment } from "@/models/Appointment";
import { PaymentLedger } from "@/models/PaymentLedger";
import { makeFinding } from "@/lib/platform/diagnostic-client";
import { toMajor, violatesChargedFloor } from "@/lib/platform/payments-client";
import type { IntegrityFinding } from "@/lib/platform/diagnostic-client";
import type { CollectorContext, CollectorOutput } from "./types";

const KEY = "payment.appointment.overpaid";

interface LedgerGroup {
  _id: unknown;
  capturedMinor: number;
}

interface AppointmentRow {
  _id: unknown;
  clientName?: string;
  serviceName?: string;
  date?: string;
  status?: string;
  pricing?: { chargedAmount?: number | null };
}

export async function collectPaymentReconciliation(
  ctx: CollectorContext,
): Promise<CollectorOutput> {
  // Neto po terminu, jednim upitom — ledger je jedini izvor, bez keširanog salda.
  const groups = (await PaymentLedger.aggregate([
    { $match: { tenantId: ctx.tenantId, "subject.type": "appointment" } },
    { $group: { _id: "$subject.id", capturedMinor: { $sum: "$amountMinor" } } },
    { $match: { capturedMinor: { $gt: 0 } } },
  ])) as LedgerGroup[];

  if (groups.length === 0) return { findings: [], scanned: 0 };

  const byAppointment = new Map(
    groups.map((row) => [String(row._id), row.capturedMinor]),
  );

  const appointments = (await Appointment.find({
    _id: { $in: groups.map((row) => row._id) },
    tenantId: ctx.tenantId,
    status: "completed",
  })
    .select("clientName serviceName date status pricing.chargedAmount")
    .lean()) as AppointmentRow[];

  const findings: IntegrityFinding[] = [];

  for (const appointment of appointments) {
    const capturedMinor = byAppointment.get(String(appointment._id)) ?? 0;
    const charged = appointment.pricing?.chargedAmount ?? null;

    if (
      !violatesChargedFloor({
        chargedMinor: charged == null ? null : Math.round(charged * 100),
        capturedMinor,
      })
    ) {
      continue;
    }

    const paidOnline = toMajor(capturedMinor);
    findings.push(
      makeFinding({
        checkKey: KEY,
        severity: "error",
        subject: { model: "Appointment", id: String(appointment._id) },
        message:
          charged == null
            ? `${appointment.clientName ?? "Klijent"} (${appointment.serviceName ?? "usluga"}, ${appointment.date ?? "?"}): plaćeno ${paidOnline} online, a termin nema upisan naplaćen iznos.`
            : `${appointment.clientName ?? "Klijent"} (${appointment.serviceName ?? "usluga"}, ${appointment.date ?? "?"}): naplaćeno ${charged}, a online je plaćeno ${paidOnline}. Termin ne može vredeti manje od novca koji je stigao.`,
        evidence: {
          chargedAmount: charged,
          paidOnline,
          date: appointment.date ?? null,
        },
        repair: { action: "manual_investigation" },
      }),
    );
  }

  return { findings, scanned: appointments.length };
}
