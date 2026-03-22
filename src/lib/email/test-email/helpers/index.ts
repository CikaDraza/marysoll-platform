export function translateAppointmentStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "Na čekanju",
    appointment_approved: "Odobren",
    appointment_rejected: "Odbijen",
    appointment_rescheduled: "Ponovo zakazan",
    appointment_cancelled: "Otkazan",
    appointment_completed: "Završen",
    no_show: "Nije se pojavio",
  };

  return statusMap[status] || status;
}

// Funkcija za ekstrakciju i prevodenje statusa iz adminNote
export function translateAdminNote(adminNote?: string): string {
  if (!adminNote) return "";

  // Proveri da li adminNote sadrži status
  const statusMatch = adminNote.match(
    /(pending|appointment_approved|appointment_rejected|appointment_rescheduled|appointment_cancelled|appointment_completed|no_show)/,
  );
  if (statusMatch) {
    const status = statusMatch[0];
    const translatedStatus = translateAppointmentStatus(status);
    return `Status termina je promenjen u: ${translatedStatus}`;
  }

  // Ako nije status, vrati originalnu poruku
  return adminNote;
}
