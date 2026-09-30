import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("platform usage refresh calibration boundary", () => {
  it("refreshes snapshots without mutating the captured calibration", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/superadmin/platformUsage.ts"),
      "utf8",
    );
    const refreshBody = source.slice(
      source.indexOf("export async function refreshPlatformUsage"),
      source.indexOf("export async function readPlatformUsage"),
    );

    expect(refreshBody).not.toContain("ResourceQuotaCalibration");
    expect(refreshBody).not.toContain("captureResourceQuotaCalibration");
    expect(refreshBody).toContain('upsertSnapshot("tenant_usage"');
  });
});
