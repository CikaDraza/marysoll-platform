"use client";
/**
 * theme-9/blocks.tsx — renderer binding teme theme-9.
 *
 * Mapa je NA NIVOU MODULA (renderers.ts:12) — nova mapa pri svakom renderu bi
 * značila remount bloka.
 *
 * theme-9 namerno NEMA renderer za `services.catalog` ni `booking.services`:
 * Marinin proizvod je Consultation, zaseban domen (`booking.consultations`),
 * i stiže u svom slice-u. Blok bez renderera se preskače uz telemetriju.
 */
import type { BlockRenderProps, ThemeBlockRenderers } from "../blocks/renderers";
import { useThemeRouting } from "../blocks/ThemeBlockScope";
import {
  theme9AboutProps,
  theme9AudiencePathsProps,
  theme9CredentialsProps,
  theme9FeaturedEducationProps,
  theme9FinalCtaProps,
  theme9GuidedCareProcessProps,
  theme9HeroProps,
  theme9LatestEducationProps,
  theme9ProfessionalPathProps,
  theme9TopicHubProps,
} from "./blockProps";
import { Theme9About } from "./AboutSection";
import { Theme9AudiencePaths } from "./AudiencePaths";
import { Theme9Credentials } from "./Credentials";
import { Theme9FeaturedEducation } from "./FeaturedEducation";
import { Theme9FinalCta } from "./FinalCta";
import { Theme9GuidedCareProcess } from "./GuidedCareProcess";
import { Theme9Hero } from "./Hero";
import { Theme9LatestEducation } from "./LatestEducation";
import { Theme9ProfessionalPath } from "./ProfessionalPath";
import { Theme9TopicHub } from "./TopicHub";

function HeroBlock({ data }: BlockRenderProps<"content.hero">) {
  const { resolveHref } = useThemeRouting();
  return <Theme9Hero {...theme9HeroProps(data, resolveHref)} />;
}

function AboutBlock({ data }: BlockRenderProps<"content.about">) {
  return <Theme9About {...theme9AboutProps(data)} />;
}

function AudiencePathsBlock({
  data,
}: BlockRenderProps<"content.audience-paths">) {
  const { resolveHref } = useThemeRouting();
  return <Theme9AudiencePaths {...theme9AudiencePathsProps(data, resolveHref)} />;
}

function TopicHubBlock({ data }: BlockRenderProps<"content.topic-hub">) {
  const { resolveHref } = useThemeRouting();
  return <Theme9TopicHub {...theme9TopicHubProps(data, resolveHref)} />;
}

function GuidedCareProcessBlock({
  data,
}: BlockRenderProps<"content.guided-care-process">) {
  return <Theme9GuidedCareProcess {...theme9GuidedCareProcessProps(data)} />;
}

function CredentialsBlock({ data }: BlockRenderProps<"content.credentials">) {
  return <Theme9Credentials {...theme9CredentialsProps(data)} />;
}

function FeaturedEducationBlock({
  data,
}: BlockRenderProps<"content.featured-education">) {
  const { resolveHref } = useThemeRouting();
  return (
    <Theme9FeaturedEducation
      {...theme9FeaturedEducationProps(data, resolveHref)}
    />
  );
}

function ProfessionalPathBlock({
  data,
}: BlockRenderProps<"content.professional-path">) {
  const { resolveHref } = useThemeRouting();
  return (
    <Theme9ProfessionalPath {...theme9ProfessionalPathProps(data, resolveHref)} />
  );
}

function LatestEducationBlock({ data }: BlockRenderProps<"content.blog">) {
  const { tenantSlug } = useThemeRouting();
  return <Theme9LatestEducation {...theme9LatestEducationProps(data, tenantSlug)} />;
}

function FinalCtaBlock({ data }: BlockRenderProps<"content.final-cta">) {
  return <Theme9FinalCta {...theme9FinalCtaProps(data)} />;
}

export const THEME9_BLOCK_RENDERERS: ThemeBlockRenderers = {
  "content.hero": HeroBlock,
  "content.audience-paths": AudiencePathsBlock,
  "content.about": AboutBlock,
  "content.topic-hub": TopicHubBlock,
  "content.featured-education": FeaturedEducationBlock,
  "content.guided-care-process": GuidedCareProcessBlock,
  "content.professional-path": ProfessionalPathBlock,
  "content.credentials": CredentialsBlock,
  "content.blog": LatestEducationBlock,
  "content.final-cta": FinalCtaBlock,
};
