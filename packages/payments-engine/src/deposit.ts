/**
 * Depozit — kada se traži i šta se s njim dešava.
 *
 * Depozit NIJE osiguranje nego poluga: novac koji salon stvarno ima u trenutku
 * kada termin postane rizičan. Zato se uzima unapred, a ne čuva se kartica —
 * kartica je obećanje koje klijentkinja može da povuče (blokada, zamena,
 * nedovoljna sredstva), a naplaćen depozit ne može.
 *
 * Univerzalan depozit obara konverziju kod klijentkinja koje nikad nisu
 * izostale — kažnjava pogrešnu grupu. Zato je okidanje USLOVNO.
 */

export type DepositTrigger =
  | "new_client"
  | "previous_no_show"
  | "high_value"
  | "peak_slot";

export interface DepositRuleConfig {
  enabled: boolean;
  /** Fiksan iznos u minor units. Salon razmišlja u dinarima, ne u procentima. */
  amountMinor: number;
  /** Koji uslovi uopšte pale zahtev za depozit. */
  triggers: readonly DepositTrigger[];
  /** Prag za `high_value`, u minor units. */
  highValueThresholdMinor?: number | null;
}

export interface DepositEvaluationInput {
  config: DepositRuleConfig;
  /** Broj ranije ZAVRŠENIH poseta te klijentkinje kod tog salona. */
  completedVisits: number;
  /** Broj ranijih nedolazaka (uključuje kasna otkazivanja). */
  noShows: number;
  /** Ukupna vrednost termina pre pogodnosti; `null` = još nije poznata. */
  appointmentValueMinor: number | null;
  /** Salon je taj termin označio kao udarni. */
  peakSlot: boolean;
}

export interface DepositEvaluation {
  required: boolean;
  amountMinor: number;
  /** Zbog čega je tražen — ide u `policySnapshot` i u tekst klijentkinji. */
  reasons: DepositTrigger[];
}

/**
 * Da li ovaj termin traži depozit.
 *
 * Vraća i RAZLOGE, ne samo odluku: klijentkinji se mora reći zašto se traži
 * („prvi termin kod nas"), a spor se kasnije brani upravo tim zapisom.
 */
export function evaluateDeposit(input: DepositEvaluationInput): DepositEvaluation {
  const { config } = input;
  if (!config.enabled || config.amountMinor <= 0) {
    return { required: false, amountMinor: 0, reasons: [] };
  }

  const triggers = new Set(config.triggers);
  const reasons: DepositTrigger[] = [];

  if (triggers.has("new_client") && input.completedVisits <= 0) {
    reasons.push("new_client");
  }
  if (triggers.has("previous_no_show") && input.noShows > 0) {
    reasons.push("previous_no_show");
  }
  if (
    triggers.has("high_value") &&
    typeof config.highValueThresholdMinor === "number" &&
    input.appointmentValueMinor != null &&
    input.appointmentValueMinor >= config.highValueThresholdMinor
  ) {
    reasons.push("high_value");
  }
  if (triggers.has("peak_slot") && input.peakSlot) {
    reasons.push("peak_slot");
  }

  return {
    required: reasons.length > 0,
    // Depozit nikad ne prelazi vrednost termina — inače bi klijentkinja platila
    // više unapred nego što usluga vredi.
    amountMinor:
      input.appointmentValueMinor != null
        ? Math.min(config.amountMinor, input.appointmentValueMinor)
        : config.amountMinor,
    reasons,
  };
}

/** Šta se dešava sa naplaćenim depozitom kada termin ne bude izvršen. */
export type DepositOutcome = "credit" | "forfeit" | "manual";

/**
 * Ishod depozita po fazi otkazivanja.
 *
 * Faza dolazi iz POSTOJEĆEG `clientAppointmentPhase()` — ne uvodi se drugi
 * model vremena. Grace period time besplatno štiti pogrešan klik.
 *
 *   open     u roku (ili grace) → vrednost se čuva klijentkinji
 *   late     kasno otkazivanje  → zadržan, isto kao nedolazak
 *   started  nedolazak          → zadržan
 *   unknown  faza se ne može utvrditi → BEZ automatskog kretanja novca
 */
export function depositOutcomeForPhase(
  phase: "open" | "late" | "started" | "unknown",
): DepositOutcome {
  if (phase === "open") return "credit";
  if (phase === "unknown") return "manual";
  return "forfeit";
}
