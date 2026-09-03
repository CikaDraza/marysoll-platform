/**
 * Stabilan identitet points-shop ponude (T1-4).
 *
 * Ovi testovi drže granicu koju je lako srušiti tihom izmenom: dok god
 * `assignPointsShopIds` čuva id kroz izmenu i reorder, redemption po id-ju je
 * bezbedan. Čim bi id počeo da prati poziciju, klijentkinja bi platila jednu
 * nagradu a dobila drugu.
 */
import { describe, expect, it } from "vitest";
import { assignPointsShopIds, newPointsShopOfferId } from "./pointsShopIdentity";

const reward = { type: "fixed" as const, value: 500, serviceName: "", expiresDays: 30 };

describe("assignPointsShopIds", () => {
  it("nova ponuda dobija server-generisan id", () => {
    const [offer] = assignPointsShopIds([{ costPoints: 500, reward }], []);
    expect(offer.id).toMatch(/^psh_[0-9a-f]{16}$/);
  });

  it("izmena cene ne menja id", () => {
    const [created] = assignPointsShopIds([{ costPoints: 500, reward }], []);
    const [edited] = assignPointsShopIds(
      [{ id: created.id, costPoints: 800, reward }],
      [created],
    );
    expect(edited.id).toBe(created.id);
    expect(edited.costPoints).toBe(800);
  });

  it("promena redosleda ne menja id-jeve", () => {
    const saved = assignPointsShopIds(
      [
        { costPoints: 500, reward },
        { costPoints: 800, reward: { ...reward, type: "percent", value: 20 } },
      ],
      [],
    );
    const reordered = assignPointsShopIds([saved[1], saved[0]], saved);
    expect(reordered[0].id).toBe(saved[1].id);
    expect(reordered[1].id).toBe(saved[0].id);
  });

  it("idempotentno je: drugi prolaz ne menja ništa", () => {
    const first = assignPointsShopIds([{ costPoints: 500, reward }], []);
    const second = assignPointsShopIds(first, first);
    expect(second).toEqual(first);
  });

  it("podmetnut id koji ne pripada salonu se odbacuje", () => {
    const [offer] = assignPointsShopIds(
      [{ id: "psh_tudjidentitet", costPoints: 500, reward }],
      [],
    );
    expect(offer.id).not.toBe("psh_tudjidentitet");
  });

  it("dupliran id u istom payload-u ne pravi dve ponude sa istim identitetom", () => {
    const [existing] = assignPointsShopIds([{ costPoints: 500, reward }], []);
    const result = assignPointsShopIds(
      [
        { id: existing.id, costPoints: 500, reward },
        { id: existing.id, costPoints: 900, reward },
      ],
      [existing],
    );
    expect(result[0].id).toBe(existing.id);
    expect(result[1].id).not.toBe(existing.id);
  });

  it("zatečena ponuda bez id-a dobija nov id, ne indeks", () => {
    const [offer] = assignPointsShopIds(
      [{ costPoints: 500, reward }],
      [{ id: null }],
    );
    expect(offer.id).toMatch(/^psh_/);
    expect(offer.id).not.toBe("0");
  });

  it("generisani id-jevi se ne ponavljaju", () => {
    const ids = new Set(Array.from({ length: 200 }, () => newPointsShopOfferId()));
    expect(ids.size).toBe(200);
  });
});
