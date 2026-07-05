/**
 * lib/email/helpers.ts
 *
 * Shared utilities for email templates.
 * Status translations and note parsing.
 */

function translateAppointmentStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "Na čekanju",
    appointment_approved: "Odobren",
    appointment_rejected: "Odbijen",
    appointment_rescheduled: "Ponovo zakazan",
    appointment_cancelled: "Otkazan",
    completed: "Završen",
    no_show: "Nije se pojavio",
  };
  return statusMap[status] || status;
}

/**
 * Extracts and translates appointment status from adminNote string.
 * If note contains a status keyword, returns translated status message.
 * Otherwise returns the original note text.
 */
export function translateAdminNote(adminNote?: string): string {
  if (!adminNote) return "";

  const statusMatch = adminNote.match(
    /(pending|appointment_approved|appointment_rejected|appointment_rescheduled|appointment_cancelled|completed|no_show)/
  );

  if (statusMatch) {
    const status = statusMatch[0];
    const translatedStatus = translateAppointmentStatus(status);
    return `Status termina je promenjen u: ${translatedStatus}`;
  }

  return adminNote;
}
