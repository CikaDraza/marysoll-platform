import { describe, expect, it } from "vitest";
import type { IAppointmentPricing } from "@/types";
import {
  createPriceProposal,
  evaluatePriceProposalDecision,
} from "./priceProposal";

function pricing(knownAddonsTotal = 400): IAppointmentPricing {
  return {
    mode: "on_request",
    currency: "RSD",
    baseAmount: null,
    minimumTotal: null,
    knownAddonsTotal,
    quotedBaseAmount: null,
    quotedTotal: null,
    quotedAt: null,
    quotedBy: null,
    chargedAmount: null,
    chargedAt: null,
    chargedBy: null,
    lines: [],
  };
}

function appointment(overrides: Record<string, unknown> = {}) {
  return {
    status: "pending",
    date: "2099-06-20",
    time: "10:00",
    pricing: pricing(),
    priceProposal: createPriceProposal(
      pricing(),
      3200,
      "admin-1",
      new Date("2026-09-26T08:00:00Z"),
    ),
    ...overrides,
  };
}

describe("predlog cene", () => {
  it("server izvodi ukupan iznos iz osnovne cene i poznatih dodataka", () => {
    const proposal = createPriceProposal(pricing(400), 3200, "admin-1");

    expect(proposal).toMatchObject({
      quotedBaseAmount: 3200,
      quotedTotal: 3600,
      currency: "RSD",
      proposedBy: "admin-1",
    });
  });

  it("prihvatanje promoviše predlog u canonical pricing", () => {
    const result = evaluatePriceProposalDecision(
      appointment(),
      "accept",
      new Date("2026-09-26T09:00:00Z"),
    );

    expect(result.ok).toBe(true);
    if (result.ok && result.kind === "accepted") {
      expect(result.pricing.quotedBaseAmount).toBe(3200);
      expect(result.pricing.quotedTotal).toBe(3600);
    }
  });

  it("odbijanje ne upisuje canonical cenu", () => {
    expect(
      evaluatePriceProposalDecision(
        appointment(),
        "reject",
        new Date("2026-09-26T09:00:00Z"),
      ),
    ).toEqual({ ok: true, kind: "rejected" });
  });

  it("ne prihvata predlog nakon početka termina", () => {
    const result = evaluatePriceProposalDecision(
      appointment({ date: "2026-09-25", time: "10:00" }),
      "accept",
      new Date("2026-09-26T09:00:00Z"),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe("started");
  });

  it("ne prihvata staru cenu posle promene poznatih dodataka", () => {
    const result = evaluatePriceProposalDecision(
      appointment({ pricing: pricing(900) }),
      "accept",
      new Date("2026-09-26T09:00:00Z"),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe("stale");
  });

  it("termin bez predloga nema o čemu da odluči", () => {
    const result = evaluatePriceProposalDecision(
      appointment({ priceProposal: undefined }),
      "accept",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe("no_proposal");
  });
});
