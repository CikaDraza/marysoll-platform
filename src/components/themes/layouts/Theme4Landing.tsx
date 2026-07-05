"use client";
/**
 * Theme4Landing — landing blok teme theme-4, izdvojen iz ThemeLayout (Faza 4).
 * ThemeLayout ga učitava kroz next/dynamic pa tenant dobija SAMO chunk
 * svoje teme (ranije su sve teme išle u svaki landing bundle).
 */
import {
  Theme1GallerySection,
} from "../theme-1";
import {
  Theme4AboutSoft,
  Theme4AppointmentSection,
  Theme4CTA,
  Theme4FAQSection,
  Theme4Footer,
  Theme4GalleryMasonry,
  Theme4Header,
  Theme4HeroSoft,
  Theme4ServicesSoft,
  Theme4WorkingHours,
} from "../theme-4";
import {
  shouldShowWorkingHours,
} from "@/helpers/workingHoursDisplay";
import {
  formatStatValue,
} from "@/lib/tenant/tenantStatsUtils";
import type { ThemeLandingProps } from "./types";

export function Theme4Landing(props: ThemeLandingProps) {
  const {
    aboutEnabled,
    appointmentEnabled,
    brandingVars,
    clientSlug,
    effectiveGalleryVariant,
    faqEnabled,
    footerProps,
    galleryEnabled,
    googleFontHref,
    headerProps,
    heroEnabled,
    instagram,
    ls,
    resolvedCta,
    salon,
    salonWithMergedSocial,
    services,
    servicesPreviewEnabled,
    tenantSlug,
    tenantStats,
  } = props;

  return (
    <div className="min-h-screen flex flex-col" style={brandingVars}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href={googleFontHref} />

      <Theme4Header
        {...headerProps}
        cta={resolvedCta.secondary}
        salon={salonWithMergedSocial}
        salonPhone={salon.phone}
      />

      <main className="flex-1 flex flex-col overflow-x-hidden">
        {/* 1. HERO */}
        {heroEnabled && (
          <Theme4HeroSoft
            headline={ls?.landing?.hero?.headline}
            subheadline={ls?.landing?.hero?.subheadline}
            imageMain={ls?.landing?.hero?.image}
            cta={resolvedCta.primary}
          />
        )}

        {/* 2. ABOUT */}
        {aboutEnabled && (
          <Theme4AboutSoft
            headline={ls?.landing?.about?.headline || "O nama"}
            paragraphs={
              ls?.landing?.about?.paragraphs || ["Saznajte više o nama"]
            }
            links={ls?.landing?.about?.links ?? []}
            stats={
              tenantStats
                ? [
                    {
                      value: formatStatValue(tenantStats.clientCount),
                      label: "Zadovoljnih klijenata",
                    },
                    {
                      value: formatStatValue(
                        tenantStats.completedAppointmentCount,
                      ),
                      label: "Urađenih tretmana",
                    },
                    ...(ls?.landing?.about?.yearsOfExperience
                      ? [
                          {
                            value: `${ls.landing.about.yearsOfExperience}+`,
                            label: "Godina iskustva",
                          },
                        ]
                      : []),
                  ]
                : ls?.landing?.stats || [
                    { value: "500+", label: "Zadovoljnih klijenata" },
                    { value: "800+", label: "Urađenih tretmana" },
                  ]
            }
            image={ls?.landing?.about?.image}
          />
        )}

        {servicesPreviewEnabled && (
          <Theme4ServicesSoft
            showIcons={ls?.landing?.servicesPreview?.showIcons ?? true}
            services={services}
            headline={ls?.landing?.servicesPreview?.headline}
            subheadline={ls?.landing?.servicesPreview?.subheadline}
            tenantSlug={tenantSlug}
            imageUrl={ls?.landing?.servicesPreview?.image?.src}
          />
        )}

        {/* 4. WORKING HOURS */}
        {salon?.workingHours && shouldShowWorkingHours(salon) && (
          <Theme4WorkingHours workingHours={salon.workingHours} />
        )}

        <Theme4CTA
          headline={
            "Slobodni termini danas. Masaže, tela i lica, nega vašeg tela"
          }
          cta={{
            href: "#termini-sekcija",
            text: "Zakaži termin",
          }}
        />

        {/* 8. APPOINTMENT */}
        {appointmentEnabled && (
          <Theme4AppointmentSection
            tenantSlug={tenantSlug}
            clientSlug={clientSlug ?? tenantSlug}
            salon={salon}
            services={services}
            headline={ls?.landing?.appointmentSection?.headline}
            subheadline={ls?.landing?.appointmentSection?.subheadline}
            instructions={ls?.landing?.appointmentSection?.instructions}
          />
        )}
        {/* 6. FULL GALLERY */}
        {galleryEnabled &&
          (effectiveGalleryVariant === "images-only" ? (
            <Theme4GalleryMasonry
              images={ls?.landing?.gallery?.images}
              headline={ls?.landing?.gallery?.headline}
            />
          ) : (
            <Theme1GallerySection
              instagramUrl={
                ls?.landing?.gallery?.instagram?.link || instagram
              }
              instagramTag={
                ls?.landing?.gallery?.instagram?.username || instagram
              }
              headline={ls?.landing?.gallery?.headline}
              subheadline={ls?.landing?.gallery?.subheadline}
              treatments={
                ls?.landing?.gallery?.treatments &&
                ls.landing.gallery.treatments.length > 0
                  ? ls.landing.gallery.treatments
                  : undefined
              }
            />
          ))}
        {faqEnabled && (
          <Theme4FAQSection
            headline={ls?.landing?.faq?.headline}
            subheadline={ls?.landing?.faq?.subheadline}
            items={ls?.landing?.faq?.items}
            supportText={ls?.landing?.faq?.support?.text}
            supportEmail={ls?.landing?.faq?.support?.email}
          />
        )}
      </main>

      <Theme4Footer {...footerProps} salon={salon} />
    </div>
  );

}
