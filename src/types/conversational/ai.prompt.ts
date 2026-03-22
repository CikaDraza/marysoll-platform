// src/types/conversational/ai.prompt.ts
import { LayoutBlockType } from "./blocks";
import { AIAction, InteractionPhase } from "./layout";

export interface AIPromptContext {
  phase: InteractionPhase;
  userInput: string;

  layout: ReadonlyArray<{
    id: string;
    type: LayoutBlockType;
    priority: number;
  }>;

  allowedActions: readonly AIAction[];
  allowedBlockTypes: readonly LayoutBlockType[];
}
