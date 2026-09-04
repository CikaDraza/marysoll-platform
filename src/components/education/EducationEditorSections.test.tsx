import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import {
  EducationAccessSection,
  EducationLinkAndSeoSection,
} from "./EducationEditorSections";
import {
  emptyEducationEditorState,
  type EducationEditorState,
} from "./education-content-editor-model";

/**
 * Adresa pod kojom sadržaj živi i tekst kojim se pojavljuje u pretrazi nisu
 * „napredna podešavanja": bili su sklopljeni u Disclosure panel, pa i sakriveni
 * i svrstani u isti koš sa podešavanjima koja niko ne dira.
 */
const state = (over: Partial<EducationEditorState> = {}): EducationEditorState => ({
  ...emptyEducationEditorState(),
  title: "Kako prepoznati dehidriranu kožu",
  ...over,
});

/** `AssetMediaField` doseže do medija i `useAuth`, pa render traži klijenta. */
function markup(element: React.ReactElement): string {
  return renderToStaticMarkup(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {element}
    </QueryClientProvider>,
  );
}

function linkAndSeo(over: Partial<EducationEditorState> = {}): string {
  return markup(
    <EducationLinkAndSeoSection
      state={state(over)}
      slugPreview="kako-prepoznati-dehidriranu-kozu"
      hasCustomSeo={false}
      onChange={() => undefined}
    />,
  );
}

describe("Link i SEO sekcija", () => {
  it("polje se zove Link sadržaja i pokazuje javni prefiks", () => {
    const html = linkAndSeo();

    expect(html).toContain("Link sadržaja");
    expect(html).toContain("/edukacija/");
    expect(html).not.toContain("Web adresa");
  });

  it("stoji otvorena, bez sklopljenog panela", () => {
    const html = linkAndSeo();

    // Disclosure renderuje dugme koje otvara panel; ovde ga nema.
    expect(html).not.toContain('aria-expanded');
    expect(html).not.toContain("Napredna podešavanja");
    expect(html).toContain("7 · Link i SEO");
  });

  it("SEO polja su vidljiva odmah, za javan i zaključan sadržaj", () => {
    for (const accessMode of ["public", "gated"] as const) {
      const html = linkAndSeo({ accessMode });

      expect(html).toContain("SEO naslov");
      expect(html).toContain("SEO opis");
      expect(html).toContain("Slika za deljenje");
    }
  });

  it("privatan sadržaj nema javnu stranu, pa ni SEO polja", () => {
    const html = linkAndSeo({ accessMode: "private" });

    expect(html).toContain("Link sadržaja");
    expect(html).not.toContain("SEO naslov");
  });

  it("kaže da SEO tekst nije ono što se vidi na strani", () => {
    expect(linkAndSeo()).toContain(
      "Na samoj strani se prikazuju naslov i kratak opis iz sekcije 1.",
    );
  });
});

describe("Pristup sekcija", () => {
  it("ne obećava objavljivanje — ono je dugme u zaglavlju", () => {
    const html = markup(
      <EducationAccessSection state={state()} onChange={() => undefined} />,
    );

    expect(html).toContain("6 · Pristup");
    expect(html).not.toContain("6 · Pristup / objavljivanje");
    expect(html).toContain("Ko može da vidi");
  });
});
