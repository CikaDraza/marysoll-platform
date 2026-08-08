import { describe, expect, it } from "vitest";
import { tenantAppName } from "./tenantAppName";

describe("tenantAppName", () => {
  it("koristi naziv salona", () => {
    expect(tenantAppName("  Lash Room by Anja  ")).toBe(
      "Lash Room by Anja",
    );
  });

  it("koristi Marysoll kada naziv salona nedostaje", () => {
    expect(tenantAppName()).toBe("Marysoll");
    expect(tenantAppName("   ")).toBe("Marysoll");
  });
});
