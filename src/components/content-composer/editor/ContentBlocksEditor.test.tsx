import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";
import { moveBlockRelativeToVisible } from "@/lib/content/editor/blockOperations";
import { ContentBlocksEditor } from "./ContentBlocksEditor";

/**
 * Prvi vidljivi blok je automatski otvoren, a njegova polja dosežu do medija
 * i `useAuth`, pa render traži klijenta upita.
 */
function markup(element: React.ReactElement): string {
  return renderToStaticMarkup(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {element}
    </QueryClientProvider>,
  );
}

/** Atributi otvarajućih `<button>` tagova — dovoljno za `disabled` proveru. */
function buttons(html: string, label: string): string[] {
  return html
    .split("<button")
    .slice(1)
    .map((part) => part.slice(0, part.indexOf(">")))
    .filter((attributes) => attributes.includes(`aria-label="${label}"`));
}

/** `disabled:opacity-30` je Tailwind klasa — traži se pravi atribut. */
function disabledFlags(html: string, label: string): boolean[] {
  return buttons(html, label).map((attributes) =>
    attributes.includes('disabled=""'),
  );
}

const video: ContentBlock = {
  id: "video",
  type: "VideoBlock",
  priority: 1,
  source: { provider: "youtube", url: "https://youtu.be/x" },
};

const article = (id: string, priority: number): ContentBlock => ({
  id,
  type: "ArticleBlock",
  priority,
  title: id,
  paragraphs: ["tekst"],
});

const download: ContentBlock = {
  id: "download",
  type: "FileDownloadBlock",
  priority: 2,
  title: "Materijal",
  file: { src: "https://example.test/a.pdf", fileName: "a.pdf" },
};

const callout: ContentBlock = {
  id: "callout",
  type: "CalloutBlock",
  priority: 3,
  variant: "info",
  content: "napomena",
};

describe("ContentBlocksEditor u filtriranom prikazu", () => {
  const videoRecord: ContentBlock[] = [video, article("article", 2), callout];

  it("A — usidren video je jedini vidljivi blok: obe strelice su zaključane", () => {
    const html = markup(
      <ContentBlocksEditor
        blocks={videoRecord}
        includeTypes={["VideoBlock"]}
        anchoredBlockId="video"
        onChange={() => undefined}
      />,
    );

    expect(disabledFlags(html, "Pomeri gore")).toEqual([true]);
    expect(disabledFlags(html, "Pomeri dole")).toEqual([true]);
  });

  it("A — usidren video nema sakrivanje, dupliranje ni brisanje", () => {
    const html = markup(
      <ContentBlocksEditor
        blocks={videoRecord}
        includeTypes={["VideoBlock"]}
        anchoredBlockId="video"
        onChange={() => undefined}
      />,
    );

    expect(buttons(html, "Sakrij")).toHaveLength(0);
    expect(buttons(html, "Dupliraj")).toHaveLength(0);
    expect(buttons(html, "Obriši blok")).toHaveLength(0);
  });

  it("isti VideoBlock u članku zadržava sve kontrole", () => {
    const html = markup(
      <ContentBlocksEditor
        blocks={[video, article("article", 2)]}
        onChange={() => undefined}
      />,
    );

    expect(buttons(html, "Sakrij")).toHaveLength(2);
    expect(buttons(html, "Dupliraj")).toHaveLength(2);
    expect(buttons(html, "Obriši blok")).toHaveLength(2);
    expect(disabledFlags(html, "Pomeri dole")).toEqual([false, true]);
  });

  it("B — prateći deo: prvi vidljivi blok ima zaključano gore, poslednji dole", () => {
    const html = markup(
      <ContentBlocksEditor
        blocks={videoRecord}
        excludeRenderTypes={["VideoBlock", "FileDownloadBlock"]}
        onChange={() => undefined}
      />,
    );

    expect(disabledFlags(html, "Pomeri gore")).toEqual([true, false]);
    expect(disabledFlags(html, "Pomeri dole")).toEqual([false, true]);
  });

  it("B — pomeranje pratećeg bloka ne dira canonical mesto videa", () => {
    const result = moveBlockRelativeToVisible(
      videoRecord,
      ["article", "callout"],
      "article",
      1,
    );

    expect(result.map(({ id }) => id)).toEqual(["video", "callout", "article"]);
    expect(result[0]).toEqual(videoRecord[0]);
  });

  it("C — članak sa materijalom: strelice prate samo vidljive blokove", () => {
    const html = markup(
      <ContentBlocksEditor
        blocks={[article("articleA", 1), download, article("articleB", 3)]}
        excludeRenderTypes={["FileDownloadBlock"]}
        onChange={() => undefined}
      />,
    );

    expect(disabledFlags(html, "Pomeri gore")).toEqual([true, false]);
    expect(disabledFlags(html, "Pomeri dole")).toEqual([false, true]);
  });

  it("E — nefiltriran prikaz zadržava zatečeno ponašanje strelica", () => {
    const html = markup(
      <ContentBlocksEditor
        blocks={[article("a", 1), download, article("b", 3)]}
        onChange={() => undefined}
      />,
    );

    expect(disabledFlags(html, "Pomeri gore")).toEqual([true, false, false]);
    expect(disabledFlags(html, "Pomeri dole")).toEqual([false, false, true]);
  });
});
