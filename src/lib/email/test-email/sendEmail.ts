// lib/email/buildEmail.ts

import { appointmentApprovedTemplate } from "./templates/appointmentApprovedTemplate";
import { appointmentRejectedTemplate } from "./templates/appointmentRejectedTemplate";
import { appointmentRescheduledTemplate } from "./templates/appointmentRescheduledTemplate";
import { appointmentCancelledTemplate } from "./templates/appointmentCancelledTemplate";
import { testimonialCreatedTemplate } from "./templates/testimonialCreatedTemplate";
import { newsletterPromotionTemplate } from "./templates/newsletterPromotionTemplate";
import { emailVerificationTemplate } from "./templates/emailVerificationTemplate";
import { appointmentCreatedTemplate } from "./templates/appointmentCreated";

// Mock data za testiranje — koristi se samo u test-email ruti
const MOCK = {
  clientName: "Test Klijent",
  serviceName: "Gel lak",
  date: "12 Mart 2026",
  time: "14:30",
};
const unsubscribeToken = "asdasd5w34qWQREET";

export async function buildEmail(
  type: string,
  overrides?: { clientName?: string; email?: string },
): Promise<{
  subject: string;
  html: string;
  emailType: "salon" | "newsletter" | "system";
}> {
  const clientName = overrides?.clientName ?? MOCK.clientName;

  switch (type) {
    case "appointment-created":
      return {
        subject: "Termin zakazan — potvrda",
        html: await appointmentCreatedTemplate({
          clientName,
          serviceName: MOCK.serviceName,
          date: MOCK.date,
          time: MOCK.time,
          note: "Molim vas potvrdite mi sto pre termin.",
        }),
        emailType: "salon",
      };

    case "appointment-approved":
      return {
        subject: "Termin potvrđen ✓",
        html: await appointmentApprovedTemplate({
          clientName,
          serviceName: MOCK.serviceName,
          date: MOCK.date,
          time: MOCK.time,
          note: "Budite tacni na zakazan termin. Vidimo se!",
        }),
        emailType: "salon",
      };

    case "appointment-rejected":
      return {
        subject: "Informacija o vašem terminu",
        html: await appointmentRejectedTemplate({
          clientName,
          serviceName: MOCK.serviceName,
          date: MOCK.date,
          time: MOCK.time,
          note: "Postovana, Vas termin moramo pomeriti radi pripreme aparature. Nadam se razumevanju. Vas salon Marysoll",
        }),
        emailType: "salon",
      };

    case "appointment-rescheduled":
      return {
        subject: "Vaš termin je pomeren",
        html: await appointmentRescheduledTemplate({
          clientName,
          serviceName: MOCK.serviceName,
          date: "10 Mart 2026",
          time: "12:00",
          proposedDate: MOCK.date,
          proposedTime: MOCK.time,
          note: "Promena zbog internih okolnosti.",
        }),
        emailType: "salon",
      };

    case "appointment-cancelled":
      return {
        subject: "Termin otkazan",
        html: await appointmentCancelledTemplate({
          clientName,
          serviceName: MOCK.serviceName,
          date: MOCK.date,
          time: MOCK.time,
          lastUpdatedBy: "admin",
        }),
        emailType: "salon",
      };

    case "testimonial-created":
      return {
        subject: "Hvala na recenziji!",
        html: await testimonialCreatedTemplate({
          clientName,
          serviceName: MOCK.serviceName,
          rating: 5,
          comment: "Profesionalnost i odlični rezultati.",
          adminReply: "",
        }),
        emailType: "salon",
      };

    case "newsletter-promotions":
      return {
        subject: "Posebna ponuda za vas 🌸",
        html: await newsletterPromotionTemplate({
          clientName,
          subject: "Posebna ponuda za vas 🌸",
          content: `
            <p style="margin:0 0 16px 0;">Proleće je stiglo i sa njim naše <strong>prolećne promotivne cene</strong>!</p>
            <p style="margin:0 0 16px 0;">Iskoristite <strong style="color:#ff80b5;">20% popusta</strong> na sve usluge tokom marta.</p>
            <p style="margin:0;">Ne propustite ovu sjajnu ponudu. ✦</p>
          `,
          ctaUrl: `${process.env.LANDING_DOMAIN}/krema-za-lice`,
          ctaLabel: "🎉 Ne propustite sjajnu ponudu",
          unsubscribeUrl: `${process.env.NEXTAUTH_URL}/api/newsletter/unsubscribe?token=${unsubscribeToken}`,
          trackingData: {
            campaignId: "698cae1ce665e15fee737e98",
            subscriberId: "690f39152df51d0b882f5145",
          },
        }),
        emailType: "newsletter",
      };

    case "email-verification":
      return {
        subject: "Potvrdite vašu email adresu",
        html: await emailVerificationTemplate({
          clientName,
          verificationUrl: `${process.env.NEXTAUTH_URL}/login/verify-email?token=test-token-123`,
          ctaLabel: "Potvrdi email adresu",
        }),
        emailType: "system",
      };

    default:
      throw new Error(`Nepoznat tip emaila: ${type}`);
  }
}
