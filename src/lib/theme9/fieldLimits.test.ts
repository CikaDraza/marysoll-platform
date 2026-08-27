import {
  THEME9_FIELD_RULES,
  fieldFillState,
  fieldMax,
  fieldPurpose,
  type Theme9FieldKind,
} from "./fieldLimits";

/**
 * Najduži seed-ovani tekst po vrsti polja, izmeren nad
 * `scripts/seeds/data/expert-editorial-content.mts` — sadržajem koji je Marina
 * već videla i odobrila.
 *
 * Ovo je razlog zbog kog test postoji: limit koji je manji od stvarnog teksta
 * ne prijavljuje grešku, nego tiho odseče kraj rečenice pri sledećem kucanju.
 * Ako neko snizi granicu ispod ovih brojeva, ovde pada.
 */
const OBSERVED_MAX: Record<Theme9FieldKind, number> = {
  eyebrow: 26, // professionalPath.eyebrow
  headline: 62, // topicHub.headline (credentials.social.title = 45)
  lead: 168, // professionalPath.lead
  note: 121, // professionalPath.note
  itemTitle: 31, // topicHub.topics[].title
  itemText: 136, // audiencePaths.paths[].lead
  bullet: 38, // audiencePaths.paths[].bullets[]
  chip: 13, // audiencePaths.paths[].chip
  ctaLabel: 22, // professionalPath.cta.text
  price: 21, // professionalPath.formats[].priceFrom
  slot: 6, // finalCta.calendar.slots[].day
  smallLabel: 19, // credentials.social.linkLabel
  altText: 18, // credentials.social.images[].alt
  url: 26, // credentials.social.url
};

describe("granice pokrivaju zatečeni sadržaj", () => {
  for (const kind of Object.keys(OBSERVED_MAX) as Theme9FieldKind[]) {
    it(`\`${kind}\` prima najduži seed-ovani tekst (${OBSERVED_MAX[kind]})`, () => {
      expect(fieldMax(kind)).toBeGreaterThanOrEqual(OBSERVED_MAX[kind]);
    });
  }

  it("svaka granica ima bar malo zaglavlja iznad zatečenog", () => {
    for (const kind of Object.keys(OBSERVED_MAX) as Theme9FieldKind[]) {
      expect(fieldMax(kind)).toBeGreaterThan(OBSERVED_MAX[kind]);
    }
  });
});

describe("tabela pravila", () => {
  it("svaka vrsta ima granicu i objašnjenje", () => {
    for (const [kind, rule] of Object.entries(THEME9_FIELD_RULES)) {
      expect(rule.max).toBeGreaterThan(0);
      expect(rule.purpose.trim().length).toBeGreaterThan(0);
      expect(fieldPurpose(kind as Theme9FieldKind)).toBe(rule.purpose);
    }
  });

  it("objašnjenje je kratko — stoji ispod naziva polja, ne pravi zid teksta", () => {
    for (const rule of Object.values(THEME9_FIELD_RULES)) {
      expect(rule.purpose.length).toBeLessThanOrEqual(70);
    }
  });

  it("kratka polja su stvarno kraća od dugačkih", () => {
    expect(fieldMax("chip")).toBeLessThan(fieldMax("itemTitle"));
    expect(fieldMax("itemTitle")).toBeLessThan(fieldMax("headline"));
    expect(fieldMax("headline")).toBeLessThan(fieldMax("lead"));
    expect(fieldMax("slot")).toBeLessThan(fieldMax("smallLabel"));
  });
});

describe("fieldFillState", () => {
  it("prazno i kratko je `ok`", () => {
    expect(fieldFillState(0, "headline")).toBe("ok");
    expect(fieldFillState(10, "headline")).toBe("ok");
  });

  it("upozorava na 85% granice, pre nego što se udari u zid", () => {
    const max = fieldMax("headline"); // 80
    expect(fieldFillState(Math.floor(max * 0.85) - 1, "headline")).toBe("ok");
    expect(fieldFillState(Math.floor(max * 0.85), "headline")).toBe("near");
  });

  it("na granici je `full`", () => {
    const max = fieldMax("headline");
    expect(fieldFillState(max - 1, "headline")).toBe("near");
    expect(fieldFillState(max, "headline")).toBe("full");
  });

  it("radi i za vrlo kratka polja", () => {
    const max = fieldMax("slot"); // 12
    expect(fieldFillState(max, "slot")).toBe("full");
    expect(fieldFillState(0, "slot")).toBe("ok");
  });
});
