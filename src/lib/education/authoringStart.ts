import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";
import type { ContentBlockIdFactory } from "@/lib/content/editor/blockFactories";
import { educationPresetBlocks } from "@/lib/education/contentPresets";
import type { EducationContentRecord } from "@/lib/education/content-document";

export const EDUCATION_START_MODES = ["article", "import", "video"] as const;
export type EducationStartMode = (typeof EDUCATION_START_MODES)[number];

export function resolveEducationStartMode(value: unknown): EducationStartMode | null {
  return typeof value === "string" &&
    EDUCATION_START_MODES.includes(value as EducationStartMode)
    ? (value as EducationStartMode)
    : null;
}

export interface EducationNewEditorSeed {
  kind: "article" | "video";
  blocks: ContentBlock[];
}

/** URL bira samo početnu prezentaciju; postojeći zapis uvek ostaje autoritet. */
export function educationNewEditorSeed(
  mode: EducationStartMode,
  idFactory: ContentBlockIdFactory,
): EducationNewEditorSeed {
  if (mode === "import") return { kind: "article", blocks: [] };
  return {
    kind: mode,
    blocks: educationPresetBlocks(mode, idFactory),
  };
}

export function educationAuthoringMode(
  record: Pick<EducationContentRecord, "kind"> | undefined,
  startMode: EducationStartMode,
): "article" | "import" | "video" {
  if (record) return record.kind === "video" ? "video" : "article";
  return startMode;
}
