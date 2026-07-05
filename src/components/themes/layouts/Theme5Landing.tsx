"use client";
/**
 * Theme5Landing — landing blok teme theme-5, izdvojen iz ThemeLayout (Faza 4).
 * ThemeLayout ga učitava kroz next/dynamic pa tenant dobija SAMO chunk
 * svoje teme (ranije su sve teme išle u svaki landing bundle).
 */
import {
  Theme5About,
  Theme5AppointmentSection,
  Theme5Artists,
  Theme5CTA,
  Theme5Footer,
  Theme5Gallery,
  Theme5Header,
  Theme5Hero,
  Theme5HowItWorks,
  Theme5Pricing,
  Theme5Services,
  Theme5Testimonials,
  Theme5WorkingHours,
} from "../theme-5";
import {
  shouldShowWorkingHours,
} from "@/helpers/workingHoursDisplay";
import {
  mapCMS,
} from "@/lib/CMSMapper/mapCMS";
import type { ComponentProps } from "react";
import type { ThemeLandingProps } from "./types";

export function Theme5Landing(props: ThemeLandingProps) {
  const {
    artistsEnabled,
    brandingVars,
    clientSlug,
    googleFontHref,
    primaryColor,
    salon,
    secondaryColor,
    services,
    tenantSlug,
    tenantStats,
    testimonials,
    testimonialsEnabled,
  } = props;

  const ui = mapCMS(salon, services, testimonials, tenantSlug, tenantStats);

  return (
    <div className="min-h-screen flex flex-col" style={brandingVars}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href={googleFontHref} />
      {/* HEADER */}
      <Theme5Header
        data={ui.header}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        tenantSlug={tenantSlug}
        clientSlug={clientSlug ?? tenantSlug}
      />
      <main className="flex-1 flex flex-col overflow-x-hidden">
        {/* 1. HERO */}
        <Theme5Hero data={ui.hero} tenantSlug={tenantSlug} />
        {/* 2. SERVICES */}
        <Theme5Services
          data={ui.services}
          services={ui.services.services}
          tenantSlug={tenantSlug}
        />
        {/* 3. WORKING HOURS */}
        {shouldShowWorkingHours(salon) && (
          <Theme5WorkingHours
            workingHours={ui.workingHours.workingHours}
            tenantSlug={tenantSlug}
          />
        )}
        {/* 4. HOW IT WORKS */}
        <Theme5HowItWorks
          data={
            ui.howItWorks as ComponentProps<typeof Theme5HowItWorks>["data"]
          }
          tenantSlug={tenantSlug}
        />
        {/* 5. APPOINTMENT */}
        <Theme5AppointmentSection
          tenantSlug={tenantSlug}
          clientSlug={clientSlug ?? tenantSlug}
          salon={salon}
          services={services}
        />
        {/* 6. PRICING */}
        <Theme5Pricing services={services} tenantSlug={tenantSlug} />
        {/* 6. CTA */}
        <Theme5CTA data={ui.cta} />
        {/* 7. ARTISTS */}
        {artistsEnabled && (
          <Theme5Artists data={ui?.artists} tenantSlug={tenantSlug} />
        )}
        {/* 8. STATS */}
        <Theme5About data={ui.about} tenantSlug={tenantSlug} />
        {/* 9. TESTIMONIALS */}
        {testimonialsEnabled && (
          <Theme5Testimonials
            data={ui.testimonials}
            tenantSlug={tenantSlug}
          />
        )}
        {/* 10. GALLERY */}
        <Theme5Gallery data={ui.gallery} tenantSlug={tenantSlug} />
      </main>
      {/* FOOTER */}
      <Theme5Footer data={ui.footer} />
    </div>
  );

}
