import { describe, expect, it } from "vitest";
import {
  depositOutcomeForPhase,
  evaluateDeposit,
  netCaptured,
  settleAppointment,
  toMinor,
  violatesChargedFloor,
} from "./index";

describe("poravnanje računa", () => {
  it("depozit pa ostatak — račun se zatvara", () => {
    const afterDeposit = settleAppointment({
      amountDueMinor: toMinor(4800),
      entries: [{ amountMinor: toMinor(1000) }],
    });
    expect(afterDeposit.capturedMinor).toBe(toMinor(1000));
    expect(afterDeposit.remainingDueMinor).toBe(toMinor(3800));
    expect(afterDeposit.overpaid).toBe(false);

    const settled = settleAppointment({
      amountDueMinor: toMinor(4800),
      entries: [{ amountMinor: toMinor(1000) }, { amountMinor: toMinor(3800) }],
    });
    expect(settled.remainingDueMinor).toBe(0);
    expect(settled.capturedMinor).toBe(toMinor(4800));
  });

  it("keš u salonu ne ulazi u ledger — razlika je salonov direktan prihod", () => {
    const settlement = settleAppointment({
      amountDueMinor: toMinor(4800),
      entries: [{ amountMinor: toMinor(1000) }],
    });
    expect(settlement.capturedMinor).toBe(toMinor(1000));
    expect(toMinor(4800) - settlement.capturedMinor).toBe(toMinor(3800));
  });

  it("povraćaj umanjuje neto naplaćeno", () => {
    expect(
      netCaptured([{ amountMinor: toMinor(1000) }, { amountMinor: -toMinor(400) }]),
    ).toBe(toMinor(600));
  });

  it("nepoznata cena ne tvrdi koliko još treba", () => {
    const settlement = settleAppointment({
      amountDueMinor: null,
      entries: [{ amountMinor: toMinor(1000) }],
    });
    expect(settlement.remainingDueMinor).toBeNull();
    expect(settlement.capturedMinor).toBe(toMinor(1000));
  });

  it("prepoznaje preplatu", () => {
    const settlement = settleAppointment({
      amountDueMinor: toMinor(2000),
      entries: [{ amountMinor: toMinor(3000) }],
    });
    expect(settlement.overpaid).toBe(true);
    expect(settlement.remainingDueMinor).toBe(0);
  });
});

describe("donja granica naplaćenog", () => {
  it("račun ne sme da vredi manje od novca koji je stigao", () => {
    expect(
      violatesChargedFloor({ chargedMinor: toMinor(2000), capturedMinor: toMinor(3000) }),
    ).toBe(true);
  });

  it("naplaćen novac uz nepoznatu cenu je kršenje", () => {
    expect(
      violatesChargedFloor({ chargedMinor: null, capturedMinor: toMinor(1000) }),
    ).toBe(true);
  });

  it("bez ijedne uplate provera ne važi — zatečeno ponašanje netaknuto", () => {
    expect(violatesChargedFloor({ chargedMinor: null, capturedMinor: 0 })).toBe(false);
    expect(violatesChargedFloor({ chargedMinor: 0, capturedMinor: 0 })).toBe(false);
  });

  it("tačno poklapanje prolazi", () => {
    expect(
      violatesChargedFloor({ chargedMinor: toMinor(1000), capturedMinor: toMinor(1000) }),
    ).toBe(false);
  });
});

describe("uslovni depozit", () => {
  const config = {
    enabled: true,
    amountMinor: toMinor(1000),
    triggers: ["new_client", "previous_no_show", "high_value", "peak_slot"] as const,
    highValueThresholdMinor: toMinor(4000),
  };

  const base = {
    config,
    completedVisits: 5,
    noShows: 0,
    appointmentValueMinor: toMinor(2000),
    peakSlot: false,
  };

  it("lojalna klijentkinja bez nedolazaka NE plaća depozit", () => {
    expect(evaluateDeposit(base)).toEqual({
      required: false,
      amountMinor: toMinor(1000),
      reasons: [],
    });
  });

  it("nova klijentkinja plaća", () => {
    const res = evaluateDeposit({ ...base, completedVisits: 0 });
    expect(res.required).toBe(true);
    expect(res.reasons).toContain("new_client");
  });

  it("prethodni nedolazak pali depozit i posle mnogo poseta", () => {
    const res = evaluateDeposit({ ...base, noShows: 1 });
    expect(res.required).toBe(true);
    expect(res.reasons).toEqual(["previous_no_show"]);
  });

  it("skupa usluga pali prag", () => {
    const res = evaluateDeposit({ ...base, appointmentValueMinor: toMinor(4800) });
    expect(res.reasons).toEqual(["high_value"]);
  });

  it("udarni termin pali okidač", () => {
    expect(evaluateDeposit({ ...base, peakSlot: true }).reasons).toEqual(["peak_slot"]);
  });

  it("razlozi se skupljaju — klijentkinji se mora reći zašto", () => {
    const res = evaluateDeposit({
      ...base,
      completedVisits: 0,
      noShows: 2,
      peakSlot: true,
    });
    expect(res.reasons).toEqual(["new_client", "previous_no_show", "peak_slot"]);
  });

  it("isključen okidač se ne pali ni kad uslov stoji", () => {
    const res = evaluateDeposit({
      ...base,
      config: { ...config, triggers: ["peak_slot"] },
      completedVisits: 0,
    });
    expect(res.required).toBe(false);
  });

  it("depozit nikad ne prelazi vrednost termina", () => {
    const res = evaluateDeposit({
      ...base,
      completedVisits: 0,
      appointmentValueMinor: toMinor(600),
    });
    expect(res.amountMinor).toBe(toMinor(600));
  });

  it("isključen program ne traži ništa", () => {
    expect(
      evaluateDeposit({ ...base, config: { ...config, enabled: false }, completedVisits: 0 })
        .required,
    ).toBe(false);
  });
});

describe("ishod depozita po fazi otkazivanja", () => {
  it("u roku → vrednost ostaje klijentkinji", () => {
    expect(depositOutcomeForPhase("open")).toBe("credit");
  });

  it("kasno otkazivanje i nedolazak → zadržan", () => {
    expect(depositOutcomeForPhase("late")).toBe("forfeit");
    expect(depositOutcomeForPhase("started")).toBe("forfeit");
  });

  it("nepoznata faza → nikakvo automatsko kretanje novca", () => {
    expect(depositOutcomeForPhase("unknown")).toBe("manual");
  });
});
