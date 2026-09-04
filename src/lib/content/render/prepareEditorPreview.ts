import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";
import {
  validateContentBlock,
  type ContentBlockStatus,
  type ContentValidationIssue,
} from "@/lib/content/validation/contentBlockValidation";

export interface EditorPreviewUnavailableBlock {
  blockId: string;
  blockType: string;
  status: Exclude<ContentBlockStatus, "VALID" | "HIDDEN">;
  issues: ContentValidationIssue[];
}

export interface EditorPreviewContent {
  blocks: ContentBlock[];
  unavailable: EditorPreviewUnavailableBlock[];
}

/**
 * Keeps the shared renderer safe while a controlled editor contains incomplete
 * drafts. Hidden blocks stay absent; malformed input is diagnosed, never thrown.
 */
export function prepareEditorPreview(
  values: readonly unknown[],
): EditorPreviewContent {
  const blocks: ContentBlock[] = [];
  const unavailable: EditorPreviewUnavailableBlock[] = [];

  for (const value of values) {
    const result = validateContentBlock(value);
    if (result.status === "VALID" && result.block) {
      blocks.push(result.block);
      continue;
    }
    if (result.status === "INCOMPLETE" || result.status === "INVALID") {
      unavailable.push({
        blockId: result.blockId,
        blockType: result.blockType,
        status: result.status,
        issues: result.issues,
      });
    }
  }

  return { blocks, unavailable };
}
