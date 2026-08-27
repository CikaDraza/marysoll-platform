import {
  planStarterProvisioning,
  theme9ProvisioningAllowed,
} from "../../../scripts/seeds/expert-editorial-provisioning.ts";

describe("Expert Editorial starter provisioning", () => {
  it("default filluje missing i prazan blok", () => {
    const plan = planStarterProvisioning([
      { path: "missing", current: undefined, starter: { headline: "Demo" } },
      { path: "empty", current: {}, starter: { headline: "Demo" } },
    ]);
    expect(plan.map((x) => x.action)).toEqual(["FILL", "FILL"]);
    expect(plan.every((x) => x.writes)).toBe(true);
  });

  it("default čuva meaningful tenant-authored sadržaj", () => {
    const [decision] = planStarterProvisioning([
      {
        path: "landing.audiencePaths",
        current: { headline: "Marinin novi tekst" },
        starter: { headline: "Demo tekst" },
      },
    ]);
    expect(decision.action).toBe("PRESERVE");
    expect(decision.writes).toBe(false);
  });

  it("čuva i eksplicitnu OFF/ON odluku bez drugog sadržaja", () => {
    const plan = planStarterProvisioning([
      { path: "off", current: { enabled: false }, starter: { enabled: true } },
      {
        path: "on",
        current: { enabled: true },
        starter: { enabled: true, headline: "Demo" },
      },
    ]);
    expect(plan.map((x) => x.action)).toEqual(["PRESERVE", "PRESERVE"]);
  });

  it("identična vrednost je NO-OP", () => {
    const value = { headline: "Isto" };
    const [decision] = planStarterProvisioning([
      { path: "same", current: value, starter: value },
    ]);
    expect(decision).toMatchObject({ action: "NO-OP", writes: false });
  });

  it("force jasno označava overwrite, ali identično ostaje NO-OP", () => {
    const plan = planStarterProvisioning(
      [
        {
          path: "changed",
          current: { headline: "Live" },
          starter: { headline: "Demo" },
        },
        {
          path: "same",
          current: { headline: "Demo" },
          starter: { headline: "Demo" },
        },
      ],
      { forceReseed: true },
    );
    expect(plan.map((x) => x.action)).toEqual(["FORCE", "NO-OP"]);
  });

  it("legacy tenant traži eksplicitan provisioning razlog", () => {
    expect(theme9ProvisioningAllowed("theme-9", false)).toBe(true);
    for (let theme = 1; theme <= 8; theme += 1) {
      expect(theme9ProvisioningAllowed(`theme-${theme}`, false)).toBe(false);
      expect(theme9ProvisioningAllowed(`theme-${theme}`, true)).toBe(true);
    }
  });
});
