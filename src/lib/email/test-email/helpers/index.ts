// Re-export iz kanonskog email/helpers — ranije je ovde živela kopija
// translateAdminNote/translateAppointmentStatus sa zastarelim ključem
// "appointment_completed" (tačan status je "completed"), pa se prevod
// završenog termina razilazio od pravih email templejta.
export { translateAdminNote } from "@/lib/email/helpers";
