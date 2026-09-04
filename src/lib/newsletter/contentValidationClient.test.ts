import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";
import { getContentMutationErrorMessage } from "./contentValidationClient";

describe("Newsletter content validation error adapter", () => {
  it("pretvara structured 422 u block/path dijagnostiku", () => {
    const error = new AxiosError("Request failed");
    Object.assign(error, {
      response: {
        data: {
          error: "Content validation failed",
          code: "CONTENT_VALIDATION_FAILED",
          validation: {
            mode: "publish",
            valid: false,
            blocks: [],
            issues: [
              {
                blockId: "callout",
                blockType: "CalloutBlock",
                path: "content",
                code: "required_content",
                message: "Polje ne sme biti prazno",
                severity: "warning",
              },
            ],
          },
        },
      },
    });

    expect(getContentMutationErrorMessage(error, "Fallback")).toBe(
      "CalloutBlock · content: Polje ne sme biti prazno",
    );
  });

  it("zadržava fallback za nepoznatu grešku", () => {
    expect(getContentMutationErrorMessage({}, "Fallback")).toBe("Fallback");
  });
});
