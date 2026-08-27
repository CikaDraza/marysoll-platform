import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOTIFICATION_ICON,
  resolveNotificationIcon,
} from "./rasterLogo";

describe("resolveNotificationIcon", () => {
  it("koristi notificationLogo podešen u Profilu", () => {
    expect(resolveNotificationIcon("https://cdn.example.com/salon.webp")).toBe(
      "https://cdn.example.com/salon.webp",
    );
  });

  it.each([null, undefined, "", "   ", "https://cdn.example.com/logo.svg"])(
    "koristi Marysoll fallback kada notificationLogo nije upotrebljiv: %s",
    (logo) => {
      expect(resolveNotificationIcon(logo)).toBe(DEFAULT_NOTIFICATION_ICON);
    },
  );
});
