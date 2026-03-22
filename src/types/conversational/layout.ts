import {
  ArticleSectionBlock,
  BlockVisibility,
  ContentSplitBlock,
  CTABlock,
  FeatureGridBlock,
  HeroPrimaryBlock,
  HeroVisualBlock,
  LayoutBlockType,
  PricingBlock,
} from "@/types/conversational/blocks";

/* ------------------------------------------------------------------ */
/*  Union                                                             */
/* ------------------------------------------------------------------ */

export type LayoutBlock =
  | HeroPrimaryBlock
  | HeroVisualBlock
  | ArticleSectionBlock
  | ContentSplitBlock
  | FeatureGridBlock
  | PricingBlock
  | CTABlock;

/* ------------------------------------------------------------------ */
/*  Preview / editor helpers                                          */
/* ------------------------------------------------------------------ */

export type LayoutBlockPreview = {
  id?: string;
  type: LayoutBlockType;
  priority: number;
  visibility?: BlockVisibility;
};

export interface LayoutState {
  blocks: LayoutBlock[];
  lastUserActionAt?: number;
}

export type LayoutAction =
  | { type: "USER_HIDE_BLOCK"; blockId: string }
  | { type: "USER_SHOW_BLOCK"; blockId: string }
  | { type: "USER_REORDER"; blockId: string; toIndex: number }
  | { type: "AI_SUGGEST_LAYOUT"; blocks: LayoutBlock[] };

export type LayoutLockSource = "user" | "system";

/* ------------------------------------------------------------------ */
/*  AI / interaction                                                  */
/* ------------------------------------------------------------------ */

export const AI_ACTIONS = [
  "add_block",
  "remove_block",
  "reorder_block",
  "update_block",
  "answer_only",
] as const;

export type AIAction = (typeof AI_ACTIONS)[number];

export type InteractionPhase =
  | "idle"
  | "dragging"
  | "normalizing"
  | "ai_suggestion"
  | "locked";

export interface AIGuardrailsContext {
  phase: InteractionPhase;
  allowedActions: readonly AIAction[];
  allowedBlockTypes: readonly LayoutBlockType[];
  systemPrompt: string;
}

/* ------------------------------------------------------------------ */
/*  Drag & layout engine                                              */
/* ------------------------------------------------------------------ */

export type DragItemInput = {
  id: string;
  height?: number;
};

export type DragItem = {
  id: string;
  index: number;
  top: number;
  height: number;
  locked?: boolean;
  lockedBy?: LayoutLockSource;
  aiSuggestedIndex?: number;
};

export interface DragMeta {
  id: string;
  top: number;
  height: number;
  index: number;
  aiSuggestedIndex?: number;
  locked?: boolean;
  lockedBy?: LayoutLockSource;
}

export type DragState = {
  activeId: string | null;
  startY: number;
  currentY: number;
};
