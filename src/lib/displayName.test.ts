import { shortDisplayName } from "./displayName";

describe("shortDisplayName", () => {
  // Primeri iz zahteva — pravilo je zaključano tačno na njima.
  describe("primeri koji definišu pravilo", () => {
    it("„Marina B.” ostaje netaknuto", () => {
      expect(shortDisplayName("Marina B.")).toBe("Marina B.");
    });

    it("„Marina Bojic” ostaje netaknuto (5 karaktera)", () => {
      expect(shortDisplayName("Marina Bojic")).toBe("Marina Bojic");
    });

    it("„Marina Bosiljkovicka” se skraćuje na 6 karaktera", () => {
      expect(shortDisplayName("Marina Bosiljkovicka")).toBe("Marina Bosilj…");
    });

    it("„Marina B. Stanisavljevic” se seče na jedan razmak", () => {
      expect(shortDisplayName("Marina B. Stanisavljevic")).toBe("Marina B.");
    });
  });

  describe("granica od 6 karaktera", () => {
    it("tačno 6 karaktera se NE skraćuje", () => {
      expect(shortDisplayName("Marina Danica")).toBe("Marina Danica");
    });

    it("7 karaktera se skraćuje", () => {
      expect(shortDisplayName("Marina Danicic")).toBe("Marina Danici…");
    });
  });

  describe("sve posle druge reči se odbacuje", () => {
    it("tri reči → dve", () => {
      expect(shortDisplayName("Ana Marija Petrovic")).toBe("Ana Marija");
    });

    it("odbačeni deo ne utiče na skraćivanje druge reči", () => {
      expect(shortDisplayName("Ana Konstantinovic Petrovic")).toBe(
        "Ana Konsta…",
      );
    });
  });

  describe("prva reč se ne dira", () => {
    it("jedna reč ostaje cela, ma koliko duga", () => {
      expect(shortDisplayName("Bosiljkovicka")).toBe("Bosiljkovicka");
    });
  });

  describe("prazan i neuredan ulaz", () => {
    it("undefined → prazan string", () => {
      expect(shortDisplayName(undefined)).toBe("");
    });

    it("null → prazan string", () => {
      expect(shortDisplayName(null)).toBe("");
    });

    it("prazan string → prazan string", () => {
      expect(shortDisplayName("")).toBe("");
    });

    it("samo razmaci → prazan string", () => {
      expect(shortDisplayName("   ")).toBe("");
    });

    it("višestruki razmaci i višak razmaka okolo se normalizuju", () => {
      expect(shortDisplayName("  Marina   Bojic  ")).toBe("Marina Bojic");
    });

    it("novi red se tretira kao razmak", () => {
      expect(shortDisplayName("Marina\nBosiljkovicka")).toBe("Marina Bosilj…");
    });
  });

  describe("dijakritika", () => {
    it("naša slova se broje kao jedan karakter i ne seku se na pola", () => {
      expect(shortDisplayName("Marina Šljivančanin")).toBe("Marina Šljiva…");
    });

    it("ime sa dijakritikom u prvoj reči ostaje celo", () => {
      expect(shortDisplayName("Đurđa Čvorović")).toBe("Đurđa Čvorov…");
    });
  });
});
