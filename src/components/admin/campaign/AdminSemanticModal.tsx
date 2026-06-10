// src/components/admin/campaign/AdminSemanticModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import {
  MinusIcon,
  PlusIcon,
  XMarkIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import Image from "next/image";

import { INewsletterCampaign } from "@/types";
import {
  UpdateCampaignSemanticPayload,
  CampaignType,
  EditorialAudience,
  SemanticTone,
  type CustomCta,
} from "@/types/newsletter";
import { CampaignIntent } from "@/types/conversational/campaign";
import { useAuth } from "@/hooks/useAuth";
import { useCategories, type CategoryOption } from "@/hooks/useCategories";
import {
  CLIENT_EDITORIAL_CATEGORIES,
  PARTNER_EDITORIAL_CATEGORIES,
  normalizeEditorialAudience,
  normalizeEditorialCategory,
} from "@/lib/newsletter/editorialClassification";

import {
  useLandingPreview,
  useGeneratedImages,
  useCampaignSemantic,
  usePublishLanding,
  useDeleteLanding,
} from "@/hooks/newsletter";
import { useAutoOptimizeLayout } from "@/hooks/useAutoOptimizeLayout";

import { PreviewRenderer } from "./PreviewRenderer";
import { GeneratedImagesPanel } from "./GeneratedImagesPanel";
import LoaderButton from "@/components/elements/LoaderButton";
import type { NewsletterClientScope } from "@/lib/newsletter/clientScope";
import { slugify as slugifySlug } from "@/helpers/slugify";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  campaign: INewsletterCampaign;
  scope?: NewsletterClientScope;
}

const EMAIL_ONLY_CTA_OPTIONS = [
  { label: "Početna stranica", value: "/" },
  { label: "Usluge i cene", value: "/usluge" },
  { label: "Termini", value: "/termini" },
];

const PLATFORM_EMAIL_ONLY_CTA_OPTIONS = [
  { label: "Marysoll platforma", value: "https://marysoll.com/" },
];

const DEFAULT_CAMPAIGN_INTENT = CampaignIntent.Promotion;

type SelectOption = {
  label: string;
  value: string;
};

function normalizeLandingSlug(slug?: string | null) {
  if (!slug?.trim()) return "";
  const raw = slug
    .trim()
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/+/, "")
    .replace(/^blog\/+/i, "");
  return slugifySlug(raw);
}

function getInitialForm(
  campaign: INewsletterCampaign,
): UpdateCampaignSemanticPayload {
  const campaignType = (campaign.campaignType ?? "email-only") as CampaignType;
  const audience = normalizeEditorialAudience(
    campaign.landingPage?.audience ??
      (campaign.scope === "platform" ? "partner" : "client"),
    true,
  );
  const editorialCategory = normalizeEditorialCategory(
    campaign.landingPage?.editorialCategory,
    audience,
  );

  return {
    campaignType,
    semanticContent: {
      intent:
        (campaign.semanticContent?.intent as CampaignIntent) ||
        DEFAULT_CAMPAIGN_INTENT,
      summary: campaign.semanticContent?.summary ?? "",
      tone: (campaign.semanticContent?.tone ?? "friendly") as SemanticTone,
      status: campaign.semanticContent?.status ?? "draft",
      source: "manual",
    },
    landingPage: {
      enabled: campaign.campaignType === "email-landing",
      slug:
        campaignType === "email-landing"
          ? normalizeLandingSlug(campaign.ctaSlug || campaign.landingPage?.slug)
          : campaign.ctaSlug || "/termini",
      audience,
      editorialCategory,
      customCtas: campaign.landingPage?.customCtas ?? [],
    },
  };
}

function mapDbCategoryToEditorialValue(category: CategoryOption) {
  switch (category.key) {
    case "makeup":
      return "Makeup";
    case "nails":
      return "Nails";
    case "hair":
      return "Hair";
    case "massage":
      return "Massage";
    default:
      return category.label;
  }
}

function uniqueOptions(options: SelectOption[]) {
  const seen = new Set<string>();

  return options.filter((option) => {
    const key = option.value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildClientCategoryOptions(
  dbCategories: CategoryOption[],
): SelectOption[] {
  return uniqueOptions([
    ...CLIENT_EDITORIAL_CATEGORIES.map((category) => ({
      label: category,
      value: category,
    })),
    ...dbCategories.map((category) => ({
      label: category.label,
      value: mapDbCategoryToEditorialValue(category),
    })),
  ]);
}

function buildPartnerCategoryOptions(): SelectOption[] {
  return PARTNER_EDITORIAL_CATEGORIES.map((category) => ({
    label: category,
    value: category,
  }));
}

function getCategoryOptions(
  audience: EditorialAudience,
  dbCategories: CategoryOption[],
  selectedCategory: string,
) {
  const options =
    audience === "partner"
      ? buildPartnerCategoryOptions()
      : buildClientCategoryOptions(dbCategories);

  if (
    selectedCategory &&
    !options.some((option) => option.value === selectedCategory)
  ) {
    return [
      ...options,
      {
        label: selectedCategory,
        value: selectedCategory,
      },
    ];
  }

  return options;
}

function scoreLabel(score: number) {
  if (score > 0.85)
    return { label: "Excellent", color: "bg-green-100 text-green-800" };
  if (score > 0.7)
    return { label: "Good", color: "bg-yellow-100 text-yellow-800" };
  return { label: "Weak", color: "bg-red-100 text-red-800" };
}

export default function AdminSemanticModal({
  isOpen,
  onClose,
  campaign,
  scope,
}: Props) {
  // Form state
  const [form, setForm] = useState<UpdateCampaignSemanticPayload>(() =>
    getInitialForm(campaign),
  );
  const { user } = useAuth();
  const { data: dbCategories = [] } = useCategories();
  const isPlatformMode =
    scope?.scope === "platform" || campaign.scope === "platform";
  const canUsePartnerAudience = Boolean(user?.isSuperAdmin || isPlatformMode);
  const effectiveAudience = normalizeEditorialAudience(
    isPlatformMode ? "partner" : form.landingPage.audience,
    canUsePartnerAudience,
  );
  const selectedEditorialCategory = normalizeEditorialCategory(
    form.landingPage.editorialCategory,
    effectiveAudience,
  );
  const editorialCategoryOptions = getCategoryOptions(
    effectiveAudience,
    dbCategories,
    selectedEditorialCategory,
  );

  // Custom CTA buttons (campaign-defined) — extend the static CTA catalog so the
  // landing agent can place user-chosen destinations (incl. affiliate/external).
  const customCtas = form.landingPage.customCtas ?? [];
  const setCustomCtas = (next: CustomCta[]) =>
    setForm({
      ...form,
      landingPage: { ...form.landingPage, customCtas: next },
    });
  const addCustomCta = () =>
    setCustomCtas([...customCtas, { label: "", href: "", placement: "auto" }]);
  const removeCustomCta = (index: number) =>
    setCustomCtas(customCtas.filter((_, i) => i !== index));
  const patchCustomCta = (index: number, patch: Partial<CustomCta>) =>
    setCustomCtas(
      customCtas.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    );

  // Initialize images from existing landing — collect from all block types
  const existingImages = (() => {
    const layout = campaign?.landingPage?.layout;
    if (!layout?.length) return [];
    const urls: string[] = [];
    for (const block of layout) {
      if (block.type === "HeroBlock") {
        block.images?.forEach((img: { src?: string }) => { if (img?.src) urls.push(img.src); });
      } else if ("image" in block && block.image?.src) {
        urls.push(block.image.src);
      } else if (block.type === "FeatureBlock") {
        block.sections?.forEach((s: { image?: { src?: string } }) => { if (s?.image?.src) urls.push(s.image.src); });
      }
    }
    return [...new Set(urls)];
  })();

  const images = useGeneratedImages(existingImages, scope);

  // Hooks
  const preview = useLandingPreview({
    campaign,
    form,
    imagesUrls: images.urls,
    scope,
  });

  const { saveCampaign, isSaving, error } = useCampaignSemantic(scope);
  const { publishLanding, isPublishing } = usePublishLanding(scope);
  const { deleteLanding, isDeleting: isDeletingLanding } = useDeleteLanding(
    campaign._id,
    scope,
  );
  const { optimize, isOptimizing } = useAutoOptimizeLayout({
    campaign,
    form,
    aiLanding: preview.aiLanding
      ? {
          ...preview.aiLanding,
          seo: preview.aiLanding.seo as Record<string, unknown>,
        }
      : { layout: [], seo: {} as Record<string, unknown> },
  });

  // Derived state
  const score = preview.layout?.score;
  const label = score ? scoreLabel(score.total) : null;
  const isLayoutReady = preview.layoutReady;
  const isSeoReady = preview.seoReady;

  // Load existing preview on mount
  useEffect(() => {
    if (
      campaign.landingPage?.layout?.length &&
      !preview.layout &&
      form.campaignType === "email-landing"
    ) {
      const existingLayout = campaign.landingPage.layout;
      const existingSeo = campaign.landingPage.seo;
      const existingScore = campaign.landingPage.score ?? 0;
      const existingSemanticType =
        campaign.landingPage.semanticType ?? "promotion";
      const existingAudience = normalizeEditorialAudience(
        campaign.landingPage.audience,
        true,
      );
      const existingEditorialCategory = normalizeEditorialCategory(
        campaign.landingPage.editorialCategory,
        existingAudience,
      );
      const existingGeneratedAt = campaign.landingPage.generatedAt
        ? new Date(campaign.landingPage.generatedAt)
        : new Date();

      preview.setPreviewFromExisting({
        layout: existingLayout,
        seo: existingSeo,
        score: {
          total: existingScore,
          breakdown: {}, // ili stvarni breakdown ako postoji
        },
        meta: {
          semanticType: existingSemanticType,
          audience: existingAudience,
          editorialCategory: existingEditorialCategory,
          generatedAt: existingGeneratedAt,
        },
      });
    }
  }, [
    campaign._id,
    form.campaignType,
    campaign.landingPage?.generatedAt,
    campaign.landingPage?.layout,
    campaign.landingPage?.seo,
    campaign.landingPage?.score,
    campaign.landingPage?.semanticType,
    campaign.landingPage?.audience,
    campaign.landingPage?.editorialCategory,
    preview,
  ]);

  const handleClose = () => {
    preview.reset();
    onClose();
  };

  // SAVE - čuva sa statusom "generated"
  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();

    const intent = form.semanticContent.intent || DEFAULT_CAMPAIGN_INTENT;
    const landingSlug =
      form.campaignType === "email-landing"
        ? normalizeLandingSlug(form.landingPage.slug)
        : isPlatformMode
          ? "https://marysoll.com/"
          : form.landingPage.slug || "/termini";
    const landingAudience = normalizeEditorialAudience(
      isPlatformMode ? "partner" : form.landingPage.audience,
      canUsePartnerAudience,
    );
    const landingEditorialCategory = normalizeEditorialCategory(
      form.landingPage.editorialCategory,
      landingAudience,
    );

    try {
      await saveCampaign({
        campaignId: campaign._id.toString(),
        payload: {
          campaignType: form.campaignType,
          semanticContent: {
            ...form.semanticContent,
            intent,
            status: "generated",
            source: "manual",
            keyPoints: [],
            keywords: campaign.semanticContent?.keywords || [],
          },
          landingPage: {
            slug: landingSlug,
            layout: preview.layout?.layout || [],
            customCtas: customCtas.filter(
              (c) => c.label.trim() && c.href.trim(),
            ),
            seo: preview.aiLanding?.seo,
            score: preview.layout?.score?.total,
            semanticType:
              preview.layout?.meta?.semanticType || intent,
            audience: landingAudience,
            editorialCategory: landingEditorialCategory,
            generatedAt: new Date(),
            status: "generated",
          },
        },
      });
      toast.success("Kampanja sačuvana!");
    } catch (err) {
      console.error(err);
      toast.error("Greška pri čuvanju");
    }
  };

  // PUBLISH - objavljuje sa statusom "published"
  const handlePublish = async () => {
    if (!preview.layout?.layout?.length) {
      toast.error("Generišite landing pre objavljivanja");
      return;
    }

    try {
      const landingAudience = normalizeEditorialAudience(
        isPlatformMode ? "partner" : form.landingPage.audience,
        canUsePartnerAudience,
      );
      const landingEditorialCategory = normalizeEditorialCategory(
        form.landingPage.editorialCategory,
        landingAudience,
      );

      await publishLanding({
        campaignId: campaign._id.toString(),
        payload: {
          layout: preview.layout.layout,
          seo: preview.aiLanding?.seo,
          semanticType:
            preview.layout.meta?.semanticType ||
            form.semanticContent.intent ||
            DEFAULT_CAMPAIGN_INTENT,
          audience: landingAudience,
          editorialCategory: landingEditorialCategory,
          generatedAt: new Date().toISOString(),
          status: "published",
          score: preview.layout.score?.total,
        },
      });
      toast.success("Landing objavljen!");
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error("Greška pri objavljivanju");
    }
  };

  // DELETE LANDING
  const handleDeleteLanding = async () => {
    try {
      await deleteLanding();
      preview.reset();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/50" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg shadow-xl p-6 max-h-[90vh] overflow-auto">
          {/* HEADER */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              Semantika kampanje
            </h3>
            <button onClick={handleClose}>
              <XMarkIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          {/* CAMPAIGN INFO */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Kampanja: {campaign.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Subject: {campaign.subject}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Sumirano: {campaign.semanticContent?.summary || "—"}
            </p>
            <div>
              <strong>CTA:</strong>{" "}
              {campaign.ctaSlug || "—"}
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <div>
                Status:{" "}
                {campaign.landingPage?.status === "published" ? (
                  <span className="text-(--secondary-color)">
                    {campaign.landingPage?.status}
                  </span>
                ) : (
                  campaign.landingPage?.status || "not generated"
                )}
              </div>
              {isLayoutReady && (
                <span className="flex items-center w-auto gap-1 text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                  <CheckCircleIcon className="w-3 h-3" /> READY
                </span>
              )}
            </div>
            {score && (
              <div className="mt-2 text-xs">
                <div>
                  Score:
                  <span className="ml-1 font-semibold">
                    {(score.total * 100).toFixed(0)}%
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2 ${label?.color}`}
                  >
                    {label?.label}
                  </span>
                </div>
                {score.breakdown && (
                  <div className="mt-1 text-gray-500 dark:text-gray-400 space-y-0.5">
                    <div>Structure: {score.breakdown.structure}</div>
                    <div>Readability: {score.breakdown.readability}</div>
                    <div>Conversion: {score.breakdown.conversion}</div>
                    <div>Semantic: {score.breakdown.semantic}</div>
                    <div>Visual: {score.breakdown.visual}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Campaign type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                Tip kampanje
              </label>
              <select
                value={form.campaignType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    campaignType: e.target.value as CampaignType,
                  })
                }
                className="mt-1 w-full rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 p-2"
              >
                <option value="email-only">Email only</option>
                <option value="email-landing">Email + landing page</option>
              </select>
            </div>

            {/* Intent */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                Svrha kampanje
              </label>
              <select
                value={form.semanticContent.intent || DEFAULT_CAMPAIGN_INTENT}
                onChange={(e) =>
                  setForm({
                    ...form,
                    semanticContent: {
                      ...form.semanticContent,
                      intent: e.target.value as CampaignIntent,
                    },
                  })
                }
                className="mt-1 w-full rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 p-2"
                required
              >
                <option value="promotion">Promocija</option>
                <option value="education">Edukacija</option>
                <option value="announcement">Obaveštenje</option>
                <option value="event">Događaj</option>
                <option value="conversion">Konverzija</option>
              </select>
            </div>

            {/* Editorial audience */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                Audience
              </label>
              {isPlatformMode ? (
                <div className="mt-1 w-full rounded-md bg-gray-100 dark:bg-gray-800 p-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Partneri / saloni
                </div>
              ) : canUsePartnerAudience ? (
                <select
                  value={effectiveAudience}
                  onChange={(e) => {
                    const nextAudience = e.target.value as EditorialAudience;
                    setForm({
                      ...form,
                      landingPage: {
                        ...form.landingPage,
                        audience: nextAudience,
                        editorialCategory: normalizeEditorialCategory(
                          "",
                          nextAudience,
                        ),
                      },
                    });
                  }}
                  className="mt-1 w-full rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 p-2"
                >
                  <option value="client">Klijenti</option>
                  <option value="partner">Partneri / saloni</option>
                </select>
              ) : (
                <div className="mt-1 w-full rounded-md bg-gray-100 dark:bg-gray-800 p-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Klijenti
                </div>
              )}
            </div>

            {/* Editorial category */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                Editorial kategorija
              </label>
              <select
                value={selectedEditorialCategory}
                onChange={(e) =>
                  setForm({
                    ...form,
                    landingPage: {
                      ...form.landingPage,
                      audience: effectiveAudience,
                      editorialCategory: e.target.value,
                    },
                  })
                }
                className="mt-1 w-full rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 p-2"
              >
                {editorialCategoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* CTA Slug */}
            <div className="mt-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                CTA slug
              </label>

              {form.campaignType === "email-only" ? (
                <select
                  value={
                    isPlatformMode
                      ? "https://marysoll.com/"
                      : form.landingPage.slug
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      landingPage: {
                        ...form.landingPage,
                        slug: e.target.value,
                      },
                    })
                  }
                  className="mt-1 w-full rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 p-2"
                >
                  {(isPlatformMode
                    ? PLATFORM_EMAIL_ONLY_CTA_OPTIONS
                    : EMAIL_ONLY_CTA_OPTIONS
                  ).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    type="text"
                    value={form.landingPage.slug}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        landingPage: {
                          ...form.landingPage,
                          slug: normalizeLandingSlug(e.target.value),
                        },
                      })
                    }
                    className="mt-1 w-full rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 p-2"
                    placeholder="depend-gel-iq"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    URL gde vodi CTA dugme: booking.marysoll.com/blog/
                    {form.landingPage.slug || "depend-gel-iq"}
                  </p>
                </>
              )}
            </div>

            {/* OG IMAGE SELECT */}
            {form.campaignType === "email-landing" &&
              images.urls.length > 0 && (
                <div className="mt-4 p-3 rounded-md bg-purple-50">
                  <label className="block text-sm font-semibold text-purple-900">
                    Social Share Slika (og:image)
                    {isSeoReady && (
                      <span className="text-[10px] bg-purple-200 text-purple-700 px-1 rounded ml-2">
                        SEO DATA LOADED
                      </span>
                    )}
                  </label>
                  <select
                    value={preview.aiLanding?.seo?.ogImage || ""}
                    onChange={(e) => {
                      const newImageUrl = e.target.value;
                      const currentScore = preview.layout?.score || {
                        total: 0,
                        breakdown: {},
                      };
                      const currentBlocks = preview.aiLanding?.layout || [];
                      if (currentBlocks.length === 0) {
                        toast.error("Generišite landing pre izbora slike.");
                        return;
                      }
                      preview.setPreviewFromExisting({
                        layout: currentBlocks,
                        seo: {
                          ...(preview.aiLanding?.seo || {}),
                          ogImage: newImageUrl,
                        },
                        score: currentScore,
                        meta: preview.layout?.meta,
                      });
                    }}
                    className="mt-1 w-full rounded-md p-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
                  >
                    <option value="">Izaberi sliku...</option>
                    {images.urls.map((url, idx) => (
                      <option key={url} value={url}>
                        Slika {idx + 1}
                      </option>
                    ))}
                  </select>
                  {preview.aiLanding?.seo?.ogImage &&
                    (preview.aiLanding.seo.ogImage.startsWith(
                      "https://res.cloudinary.com/",
                    ) ? (
                      <div className="mt-2 h-20 w-32 relative overflow-hidden rounded">
                        <Image
                          fill
                          src={preview.aiLanding.seo.ogImage}
                          alt="OG Preview"
                          className="object-cover w-full h-full"
                        />
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-red-500">
                        OG slika nije sa Cloudinary-a. Izaberi validnu sliku iz
                        liste iznad.
                      </p>
                    ))}
                </div>
              )}

            {/* IMAGES - za email-landing */}
            {form.campaignType === "email-landing" && (
              <Disclosure
                as="div"
                className="border-t border-gray-200 dark:border-gray-700 px-0 py-6"
              >
                <h3 className="flow-root">
                  <DisclosureButton className="group flex w-full items-center justify-between rounded-md bg-gray-100 dark:bg-gray-800 p-2 hover:text-gray-500">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Generiši slike
                    </span>
                    <span className="flex items-center">
                      <PlusIcon className="size-5 cursor-pointer text-(--primary-color) hover:text-(--primary-color)/90 group-data-open:hidden" />
                      <MinusIcon className="size-5 cursor-pointer text-(--primary-color) hover:text-(--primary-color)/90 group-not-data-open:hidden" />
                    </span>
                  </DisclosureButton>
                </h3>

                <DisclosurePanel className="pt-6">
                  <GeneratedImagesPanel
                    imagesHook={{
                      ...images,
                      generate: images.generate,
                    }}
                  />
                </DisclosurePanel>
              </Disclosure>
            )}

            {/* Summary - samo za email-landing */}
            {form.campaignType === "email-landing" && (
              <div>
                <label className="block text-sm font-semibold">
                  Opis kampanje (summary) - koristiće se za generisanje sadržaja
                  landinga
                </label>
                <textarea
                  value={form.semanticContent.summary}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      semanticContent: {
                        ...form.semanticContent,
                        summary: e.target.value,
                      },
                    })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 p-2"
                  required
                />
              </div>
            )}

            {/* Custom CTA dugmad - samo za email-landing */}
            {form.campaignType === "email-landing" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Custom CTA dugmad (opciono)
                </label>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Dodaj sopstvene CTA pored sistemskih (npr. afilijate/eksterni
                  linkovi). AI ih raspoređuje u landing prema poziciji.
                </p>
                <div className="mt-2 space-y-2">
                  {customCtas.map((cta, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={cta.label}
                        onChange={(e) =>
                          patchCustomCta(i, { label: e.target.value })
                        }
                        placeholder="Tekst dugmeta"
                        className="min-w-[120px] flex-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 p-2 text-sm"
                      />
                      <input
                        type="text"
                        value={cta.href}
                        onChange={(e) =>
                          patchCustomCta(i, { href: e.target.value })
                        }
                        placeholder="https://… ili /putanja"
                        className="min-w-[160px] flex-[2] rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 p-2 text-sm"
                      />
                      <select
                        value={cta.placement ?? "auto"}
                        onChange={(e) =>
                          patchCustomCta(i, {
                            placement: e.target
                              .value as CustomCta["placement"],
                          })
                        }
                        className="rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 p-2 text-sm"
                      >
                        <option value="auto">Auto</option>
                        <option value="hero">Hero</option>
                        <option value="final">Finalni CTA</option>
                        <option value="pricing">Pricing</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeCustomCta(i)}
                        className="rounded-md px-2 py-1 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        aria-label="Ukloni CTA"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addCustomCta}
                    className="text-xs font-semibold text-(--primary-color) hover:underline"
                  >
                    + Dodaj CTA
                  </button>
                </div>
              </div>
            )}

            {/* Tone - samo za email-landing */}
            {form.campaignType === "email-landing" && (
              <div>
                <label className="block text-sm font-semibold">Ton</label>
                <select
                  value={form.semanticContent.tone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      semanticContent: {
                        ...form.semanticContent,
                        tone: e.target.value as SemanticTone,
                      },
                    })
                  }
                  className="mt-1 w-full rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 p-2"
                >
                  <option value="friendly">Prijateljski</option>
                  <option value="informative">Informativan</option>
                  <option value="urgent">Hitno</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
            )}

            {error && (
              <div className="text-red-500 text-sm mb-3">{error.message}</div>
            )}

            {/* ACTIONS */}
            <div className="flex flex-nowrap justify-end gap-2 pt-4">
              {form.campaignType === "email-landing" && (
                <button
                  type="button"
                  disabled={preview.isGenerating}
                  onClick={() => {
                    if (!form.semanticContent.summary?.trim()) {
                      toast.error(
                        "Unesite opis kampanje (summary) pre generisanja landinga",
                      );
                      return;
                    }
                    if (!form.semanticContent.tone) {
                      toast.error("Izaberite ton pre generisanja landinga");
                      return;
                    }
                    preview.generatePreview();
                  }}
                  className="px-3 py-2 text-xs font-semibold bg-green-500 hover:bg-green-600 text-white rounded disabled:bg-green-800"
                >
                  {preview.isGenerating ? <LoaderButton /> : "Generate landing"}
                </button>
              )}

              {form.campaignType === "email-landing" && isLayoutReady && (
                <button
                  type="button"
                  onClick={async () => {
                    const best = await optimize();
                    if (!best) {
                      toast.error("Nije pronađena bolja optimizacija.");
                      return;
                    }
                    const newScoreTotal = best.score?.total ?? 0;
                    const currentScore = preview.layout?.score?.total || 0;

                    if (newScoreTotal > currentScore) {
                      // UCITAVANJE U PREVIEW
                      preview.setPreviewFromExisting({
                        layout: best.layout,
                        score: best.score,
                        meta: best.meta,
                        // Zadržavamo postojeći SEO jer optimize menja samo layout
                        seo: preview.aiLanding?.seo || {},
                      });

                      toast.success(
                        `Layout optimizovan! Score: ${(newScoreTotal * 100).toFixed(0)}%`,
                      );
                    } else {
                      toast.error("Trenutni layout je već optimalan.");
                    }
                  }}
                  disabled={isOptimizing}
                  className="px-3 py-2 text-xs font-semibold bg-sky-500 hover:bg-sky-600 text-white rounded disabled:bg-sky-950"
                >
                  {isOptimizing ? <LoaderButton /> : "Improve Layout"}
                </button>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="px-3 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50"
              >
                {isSaving ? "Čuvanje..." : "Sačuvaj"}
              </button>

              {form.campaignType === "email-landing" && (
                <button
                  type="button"
                  disabled={isPublishing || !isLayoutReady}
                  onClick={handlePublish}
                  className="px-3 py-2 text-xs font-semibold bg-(--secondary-color)/90 hover:bg-(--secondary-color) text-white rounded disabled:opacity-50"
                >
                  {isPublishing ? "Objavljivanje..." : "Objavi landing"}
                </button>
              )}
            </div>
          </form>

          {/* PREVIEW */}
          {form.campaignType === "email-landing" && (
            <div className="py-3">
              {preview.layout?.layout ? (
                <PreviewRenderer
                  blocks={preview.layout.layout}
                  seo={preview.aiLanding?.seo}
                  isSeoLoading={preview.isGeneratingSeo}
                  isSeoReady={isSeoReady}
                />
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Nema dostupnog preview-a.
                </div>
              )}
            </div>
          )}

          {/* DELETE LANDING BUTTON */}
          <div className="w-full flex justify-end mt-8">
            {(campaign.landingPage?.layout?.length ?? 0) > 0 && (
              <button
                type="button"
                disabled={isDeletingLanding}
                onClick={handleDeleteLanding}
                className="px-3 py-2 text-xs font-semibold text-white cursor-pointer bg-red-500 hover:bg-red-600 rounded transition-colors disabled:opacity-50"
              >
                {isDeletingLanding ? <LoaderButton /> : "Obriši Landing"}
              </button>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
