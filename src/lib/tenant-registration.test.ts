import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { resolveTenantRegistrationIdentity } from "./tenant-registration";

describe("tenant registration identity contract", () => {
  it("prihvata neutralni businessName i sva tri preseta", () => {
    for (const preset of ["salon", "education", "hybrid"] as const) {
      expect(
        resolveTenantRegistrationIdentity({ businessName: "  Moj biznis  ", preset }),
      ).toEqual({ businessName: "Moj biznis", preset });
    }
  });

  it("čuva salonName backward compatibility i današnji salon default", () => {
    expect(resolveTenantRegistrationIdentity({ salonName: "Stari salon" })).toEqual(
      { businessName: "Stari salon", preset: "salon" },
    );
  });

  it("businessName je novi authority i ne pada nazad na salonName ako je nevalidan", () => {
    expect(
      resolveTenantRegistrationIdentity({
        businessName: "   ",
        salonName: "Legacy",
        preset: "education",
      }),
    ).toBeNull();
  });

  it("odbija tenantType i nepoznat preset", () => {
    expect(
      resolveTenantRegistrationIdentity({
        businessName: "Biznis",
        tenantType: "education",
      }),
    ).toEqual({ businessName: "Biznis", preset: "salon" });
    expect(
      resolveTenantRegistrationIdentity({
        businessName: "Biznis",
        preset: "medical",
      }),
    ).toBeNull();
  });

  it("API i UI koriste neutralni contract bez tenantType persistence-a", () => {
    const route = readFileSync(
      path.join(process.cwd(), "src/app/api/tenants/register/route.ts"),
      "utf8",
    );
    const form = readFileSync(
      path.join(process.cwd(), "src/components/auth/RegisterForm.tsx"),
      "utf8",
    );
    expect(route).toContain("resolveTenantRegistrationIdentity(body)");
    expect(route).toContain("createInitialTenantCapabilityConfiguration(preset)");
    expect(form).toContain('"salon" | "education" | "hybrid"');
    expect(form).toContain("businessName");
    expect(`${route}\n${form}`).not.toMatch(/tenantType/);
  });
});
