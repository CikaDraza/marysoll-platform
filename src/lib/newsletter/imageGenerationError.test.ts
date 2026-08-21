import { describe, expect, it } from "vitest";
import { getImageGenerationErrorMessage } from "./imageGenerationError";

describe("getImageGenerationErrorMessage", () => {
  it("prioritizes the actionable plan upgrade message", () => {
    expect(
      getImageGenerationErrorMessage({
        error: "Vaš plan ne uključuje ovu funkcionalnost",
        upgrade: "Nadogradite na Kiki plan za AI generisanje slika",
      }),
    ).toBe("Nadogradite na Kiki plan za AI generisanje slika");
  });

  it("keeps a safe Serbian API reason", () => {
    expect(
      getImageGenerationErrorMessage({
        error:
          "Nije moguće odrediti nalog za newsletter. Osvežite stranicu i pokušajte ponovo.",
      }),
    ).toBe(
      "Nije moguće odrediti nalog za newsletter. Osvežite stranicu i pokušajte ponovo.",
    );
  });

  it("uses a non-technical fallback for an invalid response", () => {
    expect(getImageGenerationErrorMessage(null)).toBe(
      "Generisanje slike trenutno nije dostupno. Pokušajte ponovo za nekoliko minuta.",
    );
  });
});
