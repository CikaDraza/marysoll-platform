import { notFound } from "next/navigation";
import { connectToDB } from "@/lib/db/mongodb";
import { ProfilPlatforme } from "@/models/ProfilPlatforme";
import type { Metadata } from "next";
import { PricingCards } from "@/components/marketing/PricingCards";
import { ContactForm } from "@/components/marketing/ContactForm";
import {
  CmsBackgroundDecor,
  BackHomeButton,
} from "@/components/marketing/CmsPageChrome";
import { DEFAULT_MARKETING_LANDING } from "@/lib/marketing-landing-defaults";
import type {
  MarketingLandingStructure,
  MarketingPricingPlan,
} from "@/types/marketing-landing";

interface CmsPageDoc {
  title: string;
  slug: string;
  content: string;
  updatedAt?: string;
}

async function getPageAndPlans(
  slug: string,
): Promise<{ page: CmsPageDoc | null; plans: MarketingPricingPlan[] }> {
  try {
    await connectToDB();
    const profile = (await ProfilPlatforme.findOne({})
      .select("cmsPages marketingLanding")
      .lean()) as {
      cmsPages?: Record<string, unknown>;
      marketingLanding?: MarketingLandingStructure;
    } | null;

    const cmsPage = profile?.cmsPages?.[slug];
    const page =
      cmsPage && typeof cmsPage === "object" ? (cmsPage as CmsPageDoc) : null;

    const plans =
      profile?.marketingLanding?.pricing?.plans?.length
        ? profile.marketingLanding.pricing.plans
        : DEFAULT_MARKETING_LANDING.pricing.plans;

    return { page, plans };
  } catch {
    return { page: null, plans: DEFAULT_MARKETING_LANDING.pricing.plans };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { page } = await getPageAndPlans(slug);
  return { title: page?.title ?? "Stranica" };
}

export default async function CmsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { page, plans } = await getPageAndPlans(slug);
  if (!page) notFound();

  // Contact page — skip markdown, render form directly
  if (slug === "kontakt") {
    return (
      <div className="min-h-screen bg-white relative overflow-x-clip">
        <CmsBackgroundDecor />
        <div className="max-w-7xl mx-auto px-6 py-8">
          <BackHomeButton />
        </div>
        <ContactForm headline={page.title} subheadline={page.content} />
      </div>
    );
  }

  const lines = page.content.split("\n");

  return (
    <div className="min-h-screen bg-white relative overflow-x-clip">
      <CmsBackgroundDecor />
      <div className="max-w-7xl mx-auto px-6 py-16">
        <BackHomeButton className="mb-8" />
        <h1 className="text-7xl font-bold text-gray-900 mb-8">{page.title}</h1>
        <div className="prose prose-gray max-w-none">
          {lines.map((line, i) => {
            if (line.startsWith("## ")) {
              return (
                <h2
                  key={i}
                  className="text-xl font-bold text-gray-800 mt-8 mb-3"
                >
                  {line.slice(3)}
                </h2>
              );
            }
            if (line.startsWith("# ")) {
              return (
                <h1
                  key={i}
                  className="text-2xl font-bold text-gray-900 mt-10 mb-4"
                >
                  {line.slice(2)}
                </h1>
              );
            }
            if (line.startsWith("### ")) {
              return (
                <h3
                  key={i}
                  className="text-lg font-semibold text-gray-800 mt-6 mb-2"
                >
                  {line.slice(4)}
                </h3>
              );
            }
            if (line.startsWith("- ") || line.startsWith("* ")) {
              return (
                <li key={i} className="text-gray-600 ml-4 mb-1 list-disc">
                  {line.slice(2)}
                </li>
              );
            }
            if (line.trim() === "") {
              return <div key={i} className="mb-4" />;
            }
            return (
              <p key={i} className="text-gray-600 leading-relaxed mb-3">
                {line.replace(/\*\*(.*?)\*\*/g, "$1")}
              </p>
            );
          })}
        </div>
        {page.updatedAt && (
          <p className="text-xs text-gray-400 mt-12 border-t pt-4">
            Poslednje ažuriranje:{" "}
            {new Date(page.updatedAt).toLocaleDateString("sr-Latn", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
      </div>

      {slug === "pricing" && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-6">
            <PricingCards plans={plans} />
          </div>
        </section>
      )}
    </div>
  );
}
