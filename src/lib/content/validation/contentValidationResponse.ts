import { NextResponse } from "next/server";
import type { ContentDocumentValidation } from "@/lib/content/validation/contentBlockValidation";

export function contentValidationFailureResponse(
  validation: ContentDocumentValidation,
) {
  const safeValidation = {
    ...validation,
    blocks: validation.blocks.map(({ blockId, blockType, status, issues }) => ({
      blockId,
      blockType,
      status,
      issues,
    })),
  };
  return NextResponse.json(
    {
      error: "Content validation failed",
      code: "CONTENT_VALIDATION_FAILED",
      validation: safeValidation,
    },
    { status: 422 },
  );
}
