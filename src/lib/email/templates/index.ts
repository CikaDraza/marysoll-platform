/**
 * lib/email/templates/index.ts
 *
 * All production email templates using wrapEmailLayout.
 * Import individual templates from this barrel.
 */
export {
  appointmentCreatedTemplate,
  appointmentCreatedAdminTemplate,
  appointmentClientChangedAdminTemplate,
  appointmentApprovedTemplate,
  appointmentRejectedTemplate,
  appointmentRescheduledTemplate,
  appointmentCancelledTemplate,
} from "./appointmentTemplates";

export {
  testimonialCreatedTemplate,
  emailVerificationTemplate,
  passwordResetTemplate,
  ownerVerificationTemplate,
  ownerWelcomeTemplate,
  clientVerificationTemplate,
  clientWelcomeTemplate,
  newsletterPromotionTemplate,
} from "./otherTemplates";
