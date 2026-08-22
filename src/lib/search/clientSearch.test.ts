import { describe, it, expect } from "vitest";
import {
  escapeRegex,
  tokenizeSearch,
  buildClientSearchFilter,
  buildAppointmentSearchClauses,
  CLIENT_SEARCH_FIELDS,
} from "./clientSearch";

/** Da li dati dokument prolazi kroz izgrađeni filter (simulira Mongo $and/$or). */
function matches(doc: Record<string, unknown>, raw: string): boolean {
  const filter = buildClientSearchFilter(raw, CLIENT_SEARCH_FIELDS);
  if (!filter) return true; // nema pretrage → sve prolazi
  return filter.$and.every((clause) =>
    clause.$or.some((cond) => {
      const [field, { $regex }] = Object.entries(cond)[0];
      const value = doc[field];
      return typeof value === "string" && $regex.test(value);
    }),
  );
}

describe("tokenizeSearch", () => {
  it("deli unos na reči", () => {
    expect(tokenizeSearch("marko marković")).toEqual(["marko", "marković"]);
  });

  it("skida vodeći @ sa svake reči", () => {
    expect(tokenizeSearch("@marko @salon")).toEqual(["marko", "salon"]);
  });

  it("ne dira @ unutar reči (email ostaje ceo)", () => {
    expect(tokenizeSearch("marko@gmail.com")).toEqual(["marko@gmail.com"]);
  });

  it("odbacuje prazan unos i goli @", () => {
    expect(tokenizeSearch("   ")).toEqual([]);
    expect(tokenizeSearch("@")).toEqual([]);
    expect(tokenizeSearch("@@@")).toEqual([]);
  });
});

describe("escapeRegex", () => {
  it("escape-uje metakaraktere", () => {
    expect(escapeRegex("a(b)")).toBe("a\\(b\\)");
  });
});

describe("buildClientSearchFilter", () => {
  it("vraća null kada nema šta da se traži", () => {
    expect(buildClientSearchFilter("", CLIENT_SEARCH_FIELDS)).toBeNull();
    expect(buildClientSearchFilter("  @ ", CLIENT_SEARCH_FIELDS)).toBeNull();
  });

  it("pravi po jednu $or klauzulu za svaku reč", () => {
    const filter = buildClientSearchFilter("ana bek", CLIENT_SEARCH_FIELDS);
    expect(filter?.$and).toHaveLength(2);
    expect(filter?.$and[0].$or).toHaveLength(CLIENT_SEARCH_FIELDS.length);
  });
});

describe("pretraga klijenata — ponašanje", () => {
  const ana = {
    name: "Ana Petrović",
    email: "ana@gmail.com",
    instagram: "ana_lashes",
    tiktok: "anatiktok",
    phone: "0601234567",
  };

  it("nalazi po imenu", () => {
    expect(matches(ana, "ana")).toBe(true);
  });

  it("nalazi po prezimenu", () => {
    expect(matches(ana, "petrović")).toBe(true);
  });

  it("nalazi po imenu i prezimenu u pravom redosledu", () => {
    expect(matches(ana, "ana petrović")).toBe(true);
  });

  it("nalazi po prezimenu pa imenu (redosled nije bitan)", () => {
    expect(matches(ana, "petrović ana")).toBe(true);
  });

  it("nalazi po mejlu", () => {
    expect(matches(ana, "ana@gmail.com")).toBe(true);
  });

  it("nalazi po Instagramu bez @", () => {
    expect(matches(ana, "ana_lashes")).toBe(true);
  });

  it("nalazi po Instagramu sa @", () => {
    expect(matches(ana, "@ana_lashes")).toBe(true);
  });

  it("nalazi po TikToku bez @", () => {
    expect(matches(ana, "anatiktok")).toBe(true);
  });

  it("nalazi po TikToku sa @", () => {
    expect(matches(ana, "@anatiktok")).toBe(true);
  });

  it("nalazi po telefonu", () => {
    expect(matches(ana, "060123")).toBe(true);
  });

  it("meša polja — reč iz imena + reč iz TikToka", () => {
    expect(matches(ana, "ana anatiktok")).toBe(true);
  });

  it("ne nalazi kada se jedna reč ne poklapa ni sa čim", () => {
    expect(matches(ana, "ana nepostojeci")).toBe(false);
  });

  it("ne nalazi drugog klijenta", () => {
    expect(matches(ana, "milica")).toBe(false);
  });

  it("case-insensitive je", () => {
    expect(matches(ana, "ANA PETROVIĆ")).toBe(true);
  });

  it("ne puca na regex metakarakterima", () => {
    expect(() => matches(ana, "ana (test)")).not.toThrow();
    expect(matches(ana, "ana (test)")).toBe(false);
  });

  it("gost bez Instagrama/TikToka se i dalje nalazi po imenu", () => {
    const gost = {
      name: "Gost Jedan",
      email: "guest_x@noemail.guest",
      instagram: "",
      tiktok: "",
      phone: "",
    };
    expect(matches(gost, "gost")).toBe(true);
    expect(matches(gost, "@gost")).toBe(true);
  });
});

describe("pretraga termina — Instagram i TikTok", () => {
  const ana = {
    _id: "ana-id",
    name: "Ana Petrović",
    email: "ana@gmail.com",
    instagram: "ana_lashes",
    tiktok: "ana_tok",
    phone: "0601234567",
  };
  const milica = {
    _id: "milica-id",
    name: "Milica Jović",
    email: "milica@gmail.com",
    instagram: "milica_ig",
    tiktok: "milica_tok",
    phone: "0649999999",
  };
  const candidates = [ana, milica];

  /** Simulira Mongo evaluaciju izgrađenih klauzula nad jednim terminom. */
  function matchesAppointment(
    appointment: Record<string, unknown>,
    raw: string,
  ): boolean {
    const clauses = buildAppointmentSearchClauses(raw, candidates);
    if (clauses.length === 0) return true;
    return clauses.every((clause) =>
      clause.$or.some((cond) => {
        const [field, spec] = Object.entries(cond)[0];
        if (field === "clientProfileId") {
          const { $in } = spec as { $in: unknown[] };
          return $in.includes(appointment.clientProfileId);
        }
        const { $regex } = spec as { $regex: RegExp };
        const value = appointment[field];
        return typeof value === "string" && $regex.test(value);
      }),
    );
  }

  // Termin nosi Instagram, ali NE nosi TikTok — zato TikTok mora preko profila.
  const terminAna = {
    clientProfileId: "ana-id",
    clientName: "Ana Petrović",
    clientEmail: "ana@gmail.com",
    clientInstagram: "ana_lashes",
    clientPhone: "0601234567",
    serviceName: "Šišanje i feniranje",
  };

  it("nalazi po imenu klijenta (postojeće ponašanje)", () => {
    expect(matchesAppointment(terminAna, "ana")).toBe(true);
  });

  it("nalazi po usluzi (postojeće ponašanje)", () => {
    expect(matchesAppointment(terminAna, "šišanje")).toBe(true);
  });

  it("nalazi po mejlu (postojeće ponašanje)", () => {
    expect(matchesAppointment(terminAna, "ana@gmail.com")).toBe(true);
  });

  it("nalazi po Instagramu bez @", () => {
    expect(matchesAppointment(terminAna, "ana_lashes")).toBe(true);
  });

  it("nalazi po Instagramu sa @", () => {
    expect(matchesAppointment(terminAna, "@ana_lashes")).toBe(true);
  });

  it("nalazi po TikToku bez @ (preko profila — termin ga ne nosi)", () => {
    expect(matchesAppointment(terminAna, "ana_tok")).toBe(true);
  });

  it("nalazi po TikToku sa @", () => {
    expect(matchesAppointment(terminAna, "@ana_tok")).toBe(true);
  });

  it("TikTok radi i za stari termin bez clientInstagram polja", () => {
    const stariTermin = {
      clientProfileId: "ana-id",
      clientName: "Ana P.",
      clientEmail: "",
      clientInstagram: "",
      clientPhone: "",
      serviceName: "Manikir",
    };
    expect(matchesAppointment(stariTermin, "@ana_tok")).toBe(true);
  });

  it("meša profil i termin — TikTok handle + naziv usluge", () => {
    expect(matchesAppointment(terminAna, "@ana_tok šišanje")).toBe(true);
  });

  it("ne nalazi tuđi termin po TikToku", () => {
    expect(matchesAppointment(terminAna, "@milica_tok")).toBe(false);
  });

  it("ne nalazi kada se jedna reč ne poklapa", () => {
    expect(matchesAppointment(terminAna, "ana nepostojeci")).toBe(false);
  });

  it("prazna pretraga ne filtrira ništa", () => {
    expect(buildAppointmentSearchClauses("", candidates)).toEqual([]);
    expect(buildAppointmentSearchClauses("  @ ", candidates)).toEqual([]);
  });

  it("bez poklopljenih klijenata ne dodaje clientProfileId granu", () => {
    const clauses = buildAppointmentSearchClauses("šišanje", candidates);
    const fields = clauses[0].$or.map((c) => Object.keys(c)[0]);
    expect(fields).not.toContain("clientProfileId");
  });
});
