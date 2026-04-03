// components/email-campaign/EmailCampaignAIGenerator.tsx
"use client";

import { useState, useCallback } from "react";
import { StepContainer } from "@/components/shared/StepContainer";
import { CampaignStrategistPanel } from "./strategist/CampaignStrategistPanel";
import { CampaignStrategyPreview } from "./strategist/CampaignStrategyPreview";
import { CampaignContentPanel } from "./content/CampaignContentPanel";
import { CampaignContentPreview } from "./content/CampaignContentPreview";
import { CampaignTemplatePanel } from "./template/CampaignTemplatePanel";
import { CampaignTemplatePreview } from "./template/CampaignTemplatePreview";
import { CampaignOptimizationPanel } from "./opimization/CampaignOptimizationPanel";
import { useGenerateStrategy } from "@/hooks/emailCampaign/useGenerateStrategy";
import { useGenerateContent } from "@/hooks/emailCampaign/useGenerateContent";
import { useGenerateTemplate } from "@/hooks/emailCampaign/useGenerateTemplate";
import { useOptimizeCampaign } from "@/hooks/emailCampaign/useOptimizeCampaign";
import type {
  EmailCampaignStrategy,
  EmailCampaignContent,
  EmailCampaignTemplate,
  EmailCampaignOptimization,
} from "@/types/ai/email-campaign/aiEmailCampaign.types";
import type { GenerateStrategyInput } from "@/hooks/emailCampaign/useGenerateStrategy";

type PipelineStep =
  | "input"
  | "strategy"
  | "content"
  | "template"
  | "optimization";

const STEPS = [
  { key: "input", label: "Input" },
  { key: "strategy", label: "Strategija" },
  { key: "content", label: "Sadržaj" },
  { key: "template", label: "Templejt" },
  { key: "optimization", label: "Optimizacija" },
] as const;

const STEP_ORDER: PipelineStep[] = [
  "input",
  "strategy",
  "content",
  "template",
  "optimization",
];

export function EmailCampaignAIGenerator() {
  const [step, setStep] = useState<PipelineStep>("input");
  const [strategy, setStrategy] = useState<EmailCampaignStrategy | null>(null);
  const [content, setContent] = useState<EmailCampaignContent | null>(null);
  const [template, setTemplate] = useState<EmailCampaignTemplate | null>(null);
  const [optimization, setOptimization] =
    useState<EmailCampaignOptimization | null>(null);

  // Preserved between steps so optimization panel can build the save payload
  const [lastInput, setLastInput] = useState<GenerateStrategyInput | null>(
    null,
  );

  // Counts AI calls for UsageStats display
  const [aiCallCount, setAiCallCount] = useState(0);

  const strategyMutation = useGenerateStrategy();
  const contentMutation = useGenerateContent();
  const templateMutation = useGenerateTemplate();
  const optimizeMutation = useOptimizeCampaign();

  const handleGenerateStrategy = useCallback(
    (input: GenerateStrategyInput) => {
      setLastInput(input);
      strategyMutation.mutate(input, {
        onSuccess: (data) => {
          setAiCallCount((c) => c + 1);
          setStrategy(data);
          setStep("strategy");
        },
      });
    },
    [strategyMutation],
  );

  const handleGenerateContent = useCallback(() => {
    if (!strategy) return;
    contentMutation.mutate(strategy, {
      onSuccess: (data) => {
        setAiCallCount((c) => c + 1);
        setContent(data);
        setStep("content");
      },
    });
  }, [strategy, contentMutation]);

  const handleGenerateTemplate = useCallback(() => {
    if (!content) return;
    templateMutation.mutate(content, {
      onSuccess: (data) => {
        setAiCallCount((c) => c + 1);
        setTemplate(data);
        setStep("template");
      },
    });
  }, [content, templateMutation]);

  const handleOptimize = useCallback(() => {
    if (!content) return;
    optimizeMutation.mutate(content, {
      onSuccess: (data) => {
        setAiCallCount((c) => c + 1);
        setOptimization(data);
        setStep("optimization");
      },
    });
  }, [content, optimizeMutation]);

  /** Go back one step without losing cached state — AI does NOT re-run */
  const handleGoBack = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(step);
    if (currentIndex > 0) {
      setStep(STEP_ORDER[currentIndex - 1]);
    }
  }, [step]);

  const handleReset = useCallback(() => {
    setStep("input");
    setStrategy(null);
    setContent(null);
    setTemplate(null);
    setOptimization(null);
    setLastInput(null);
    setAiCallCount(0);
    strategyMutation.reset();
    contentMutation.reset();
    templateMutation.reset();
    optimizeMutation.reset();
  }, [strategyMutation, contentMutation, templateMutation, optimizeMutation]);

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const steps = STEPS.map((s, i) => ({
    label: s.label,
    completed: i < stepIndex,
    active: i === stepIndex,
  }));

  const canGoBack = stepIndex > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-800 to-purple-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">
            🚀
          </div>
          <div>
            <h2 className="text-lg font-bold">AI Campaign Studio</h2>
            <p className="text-xs text-white/70">
              AI Growth Engine · Enterprise
            </p>
          </div>
        </div>
        <p className="text-sm text-white/80 leading-relaxed">
          Generišite kompletnu email kampanju u 4 koraka — od strategije do
          optimizovanog HTML templejta.
        </p>
      </div>

      {/* Step progress */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
        <StepContainer steps={steps}>
          <div />
        </StepContainer>
      </div>

      {/* Back button — visible on all steps except input */}
      {canGoBack && (
        <button
          onClick={handleGoBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition cursor-pointer"
        >
          ← Nazad
        </button>
      )}

      {/* ── Step: Input ── */}
      {step === "input" && (
        <CampaignStrategistPanel
          onGenerate={handleGenerateStrategy}
          isLoading={strategyMutation.isPending}
          error={strategyMutation.error?.message}
        />
      )}

      {/* ── Step: Strategy ── */}
      {step === "strategy" && strategy && (
        <CampaignStrategyPreview
          strategy={strategy}
          onProceed={handleGenerateContent}
          isLoading={contentMutation.isPending}
        />
      )}

      {/* Loading/error while generating content */}
      {(contentMutation.isPending || contentMutation.isError) &&
        step === "strategy" && (
          <CampaignContentPanel
            isLoading={contentMutation.isPending}
            error={contentMutation.error?.message}
            onRetry={handleGenerateContent}
          />
        )}

      {/* ── Step: Content ── */}
      {step === "content" && content && (
        <CampaignContentPreview
          content={content}
          onProceed={handleGenerateTemplate}
          isLoading={templateMutation.isPending}
        />
      )}

      {/* Loading/error while generating template */}
      {(templateMutation.isPending || templateMutation.isError) &&
        step === "content" && (
          <CampaignTemplatePanel
            isLoading={templateMutation.isPending}
            error={templateMutation.error?.message}
            onRetry={handleGenerateTemplate}
          />
        )}

      {/* ── Step: Template ── */}
      {step === "template" && template && (
        <CampaignTemplatePreview
          template={template}
          onProceed={handleOptimize}
          isLoading={optimizeMutation.isPending}
        />
      )}

      {/* ── Step: Optimization ── */}
      {(step === "optimization" || step === "template") && (
        <CampaignOptimizationPanel
          optimization={optimization}
          isLoading={optimizeMutation.isPending}
          error={optimizeMutation.error?.message}
          onRetry={handleOptimize}
          onReset={handleReset}
          salonProfileId={lastInput?.salonIds?.[0]}
          topic={lastInput?.topic}
          tone={lastInput?.tone}
          strategy={strategy ?? undefined}
          content={content ?? undefined}
          template={template ?? undefined}
          aiCallCount={aiCallCount}
        />
      )}
    </div>
  );
}
