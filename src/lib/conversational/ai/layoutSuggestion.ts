// lib/conversational/ai/layoutSuggestion.ts

import { LayoutBlock } from "@/types/conversational/layout";

export type AIResponse =
  | AINoOpResponse
  | AIAnswerResponse
  | AIReorderSuggestion
  | AIAddBlockSuggestion
  | AIUpdateBlockSuggestion;

export interface AINoOpResponse {
  type: "no_op";
  reason: "phase_restricted" | "no_intent" | "not_allowed";
}

export interface AIAnswerResponse {
  type: "answer";
  text: string;
}

/* ---------------- SUGGESTIONS ---------------- */

export interface AIReorderSuggestion {
  type: "suggestion";
  action: "reorder_block";
  payload: {
    blockId: string;
    position: "before" | "after" | "start" | "end";
    referenceBlockId?: string;
  };
}

export interface AIAddBlockSuggestion {
  type: "suggestion";
  action: "add_block";
  payload: {
    blockType: LayoutBlock;
    position: "start" | "end" | "before" | "after";
    referenceBlockId?: string;
  };
}

export interface AIUpdateBlockSuggestion {
  type: "suggestion";
  action: "update_block";
  payload: {
    blockId: string;
    changes: Record<string, unknown>;
  };
}
