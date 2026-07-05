"use client";
/** LandingPanel — sve landing CMS sekcije + SEO toolbar + Sačuvaj dugme. */
import {
  superAdminPrimaryButtonClass as btnPrimary,
} from "@/components/superadmin/shared";
import { useMarketingContext } from "./MarketingProvider";
import { SeoToolbar } from "./sections/SeoToolbar";
import { HeaderSection } from "./sections/HeaderSection";
import { HeroSection } from "./sections/HeroSection";
import { AboutSection } from "./sections/AboutSection";
import { HowSection } from "./sections/HowSection";
import { FeaturesSection } from "./sections/FeaturesSection";
import { PricingSection } from "./sections/PricingSection";
import { FooterSection } from "./sections/FooterSection";
import { SecHeroSection } from "./sections/SecHeroSection";
import { SecChipsSection } from "./sections/SecChipsSection";
import { SecObjectionsSection } from "./sections/SecObjectionsSection";
import { SecNotebookSection } from "./sections/SecNotebookSection";
import { SecAppSection } from "./sections/SecAppSection";
import { SecCancellationsSection } from "./sections/SecCancellationsSection";
import { SecAutomationSection } from "./sections/SecAutomationSection";
import { SecFaqSection } from "./sections/SecFaqSection";
import { SecGallerySection } from "./sections/SecGallerySection";
import { SecBookingSection } from "./sections/SecBookingSection";

export function LandingPanel() {
  const { isSaving, save } = useMarketingContext();

  return (
    <div className="space-y-3">
      <SeoToolbar />
      <HeaderSection />
      <HeroSection />
      <AboutSection />
      <HowSection />
      <FeaturesSection />
      <PricingSection />
      <FooterSection />
      <SecHeroSection />
      <SecChipsSection />
      <SecObjectionsSection />
      <SecNotebookSection />
      <SecAppSection />
      <SecCancellationsSection />
      <SecAutomationSection />
      <SecFaqSection />
      <SecGallerySection />
      <SecBookingSection />

      {/* Save */}
      <button
        className={`${btnPrimary} w-full py-3`}
        disabled={isSaving}
        onClick={() => save()}
      >
        {isSaving ? "Čuvanje..." : "Sačuvaj landing"}
      </button>
    </div>
  );
}
