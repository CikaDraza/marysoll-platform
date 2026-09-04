import { AxiosError } from "axios";
import type { ContentDocumentValidation } from "@/lib/content/validation/contentBlockValidation";

interface ContentValidationFailurePayload {
  error?: string;
  code?: string;
  validation?: ContentDocumentValidation;
}

export function getContentMutationErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ContentValidationFailurePayload | undefined;
    if (data?.code === "CONTENT_VALIDATION_FAILED") {
      const issue = data.validation?.issues[0];
      if (issue) {
        const location = [issue.blockType, issue.path].filter(Boolean).join(" · ");
        return `${location ? `${location}: ` : ""}${issue.message}`;
      }
      return data.error || fallback;
    }
    return data?.error || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
