import { describe, expect, it } from "vitest";
import { Tenant } from "./Tenant";

/**
 * Regresija za E11000 dup key { customDomain: null }.
 *
 * Uzrok: `customDomain` je imao `unique: true, sparse: true` DIREKTNO na
 * polju. `sparse` preskače samo dokumente gde polje NE POSTOJI — ne i one gde
 * je eksplicitno `null` (a svaki tenant bez sopstvenog domena upisuje baš
 * `customDomain: null` pri registraciji). Drugi takav tenant je zato pucao na
 * upisu. Popravka: polje ostaje bez `unique`/`sparse`, a jedinstvenost čuva
 * poseban PARTIAL indeks koji pokriva samo stvarne (string) domene — isti
 * obrazac kao `Subscription.paddleSubscriptionId`.
 */
describe("Tenant.customDomain — partial unique indeks", () => {
  it("polje samo NE sme imati unique/sparse (izaziva koliziju na eksplicitnom null-u)", () => {
    const path = Tenant.schema.path("customDomain") as unknown as {
      options: Record<string, unknown>;
    };
    expect(path.options.unique).toBeFalsy();
    expect(path.options.sparse).toBeFalsy();
  });

  it("ima poseban partial unique indeks koji pokriva samo string domene", () => {
    const indexes = Tenant.schema.indexes();
    const customDomainIndex = indexes.find(
      ([fields]) => JSON.stringify(fields) === JSON.stringify({ customDomain: 1 }),
    );
    expect(customDomainIndex).toBeDefined();
    const [, options] = customDomainIndex!;
    expect(options).toMatchObject({ unique: true });
    expect(options.partialFilterExpression).toEqual({
      customDomain: { $type: "string" },
    });
  });
});
