import { describe, expect, it } from "vitest";
import { isMarysollSupportNotification } from "./notificationGroups";
import type { INotification } from "@/types";

function notification(
  partial: Partial<Pick<INotification, "type" | "title" | "metadata">>,
): Pick<INotification, "type" | "title" | "metadata"> {
  return {
    type: "chat_message",
    title: "Marysoll podrška",
    metadata: {},
    ...partial,
  };
}

describe("Marysoll support notification grouping", () => {
  it("uses the persisted source even when the title changes", () => {
    expect(isMarysollSupportNotification(notification({
      title: "Poruka podrške",
      metadata: { source: "marysoll_support" },
    }))).toBe(true);
  });

  it("keeps existing support notifications without a source", () => {
    expect(isMarysollSupportNotification(notification({}))).toBe(true);
  });

  it("does not group internal chat or unrelated notifications", () => {
    expect(isMarysollSupportNotification(notification({
      title: "Nova poruka od Ane",
    }))).toBe(false);
    expect(isMarysollSupportNotification(notification({
      type: "generic",
      metadata: { source: "marysoll_support" },
    }))).toBe(false);
  });
});
