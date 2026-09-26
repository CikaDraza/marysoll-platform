import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const hook = readFileSync(
  "src/hooks/loyalty/useAppointmentCheckout.ts",
  "utf8",
);
const modal = readFileSync(
  "src/components/admin/AppointmentCheckoutModal.tsx",
  "utf8",
);

describe("checkout preview tokom promene iznosa", () => {
  it("čuva prethodni preview kada debounce promeni query key", () => {
    expect(hook).toMatch(/placeholderData:\s*keepPreviousData/);
    expect(hook).toMatch(/keepPreviousData[\s\S]*@tanstack\/react-query/);
  });

  it("loading bez preview-a prikazuje samo pri prvom učitavanju", () => {
    expect(modal).toMatch(/isLoading && !preview/);
  });
});
