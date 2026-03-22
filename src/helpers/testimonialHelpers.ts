// helpers/testimonialHelpers.ts

import { ITestimonial } from "@/types";

// Type guard za proveru da li je testimonial sa populiranim appointmentId
export function isTestimonialWithPopulatedAppointment(
  testimonial: ITestimonial<
    string | { _id: string; serviceName?: string; date?: string }
  >
): testimonial is ITestimonial<{
  _id: string;
  serviceName?: string;
  date?: string;
}> {
  return (
    typeof testimonial.appointmentId !== "string" &&
    testimonial.appointmentId !== null
  );
}

// Type guard za proveru da li je testimonial sa string appointmentId
export function isTestimonialWithStringId(
  testimonial: ITestimonial<
    string | { _id: string; serviceName?: string; date?: string }
  >
): testimonial is ITestimonial<string> {
  return typeof testimonial.appointmentId === "string";
}

// Helper funkcija za dobijanje appointment info
export function getAppointmentInfo(
  testimonial: ITestimonial<
    string | { _id: string; serviceName?: string; date?: string }
  >
): { serviceName: string; date: string } {
  if (isTestimonialWithPopulatedAppointment(testimonial)) {
    return {
      serviceName: testimonial.appointmentId.serviceName || "Nepoznata usluga",
      date: testimonial.appointmentId.date
        ? new Date(testimonial.appointmentId.date).toLocaleDateString()
        : "Nepoznat datum",
    };
  }

  // Ako je string ID, vrati podrazumevane vrednosti
  return { serviceName: "Nepoznata usluga", date: "Nepoznat datum" };
}

// Funkcija za dobijanje serviceName bez kompleksne logike
export function getServiceName(
  testimonial: ITestimonial<
    string | { _id: string; serviceName?: string; date?: string }
  >
): string {
  if (isTestimonialWithPopulatedAppointment(testimonial)) {
    return testimonial.appointmentId.serviceName || "Usluga";
  }
  return "Usluga";
}
