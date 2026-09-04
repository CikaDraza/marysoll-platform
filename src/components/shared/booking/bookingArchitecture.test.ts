import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("T1-2 booking architecture", () => {
  it("nema produkcionog ClientCreateModal-a ni importa", () => {
    expect(
      existsSync(resolve(root, "src/components/client/ClientCreateModal.tsx")),
    ).toBe(false);
    expect(source("src/components/client/AppointmentCalendar.tsx")).not.toContain(
      "ClientCreateModal",
    );
  });

  it("client create i edit ulaze kroz zajednički BookingModal", () => {
    expect(source("src/components/client/AppointmentCalendar.tsx")).toContain(
      "<BookingModal",
    );
    const edit = source("src/components/client/ClientEditModal.tsx");
    expect(edit).toContain("<BookingModal");
    expect(edit).not.toContain("estimateServicePrice");
    expect(edit).not.toContain("availableTimesForDate");
    expect(edit).not.toContain("serviceRequiresIntake");
  });

  it("javni API i server homepage dele jedan service mapper", () => {
    expect(source("src/app/api/public/[tenantSlug]/services/route.ts")).toContain(
      "toBookingServicePresentation",
    );
    expect(source("src/components/client/ClientHomePage.tsx")).toContain(
      "toBookingServicePresentation",
    );
  });
});
