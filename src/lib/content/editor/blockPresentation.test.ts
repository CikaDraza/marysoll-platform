import { describe, expect, it } from "vitest";
import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";
import { addBlock, replaceBlock } from "./blockOperations";
import { visibleContentBlocks } from "./blockPresentation";

const imported: ContentBlock[] = [
  { id: "article", type: "ArticleBlock", priority: 1, title: "Tekst", paragraphs: ["Telo"] },
  { id: "note", type: "CalloutBlock", priority: 2, variant: "info", content: "Napomena" },
];

describe("Composer presentation groups", () => {
  it("odvajanje download panela ne menja identitet ni redosled sadržaja", () => {
    const withDownload = addBlock(imported, "FileDownloadBlock", {
      idFactory: () => "download",
    });
    const main = visibleContentBlocks(withDownload, undefined, ["FileDownloadBlock"]);
    const downloads = visibleContentBlocks(withDownload, ["FileDownloadBlock"]);

    expect(main.map(({ id }) => id)).toEqual(["article", "note"]);
    expect(downloads.map(({ id }) => id)).toEqual(["download"]);
    expect(withDownload.map(({ id }) => id)).toEqual(["article", "note", "download"]);
  });

  it("uređivanje download bloka ne menja uvezeno telo", () => {
    const withDownload = addBlock(imported, "FileDownloadBlock", {
      idFactory: () => "download",
    });
    const download = withDownload[2];
    if (download.type !== "FileDownloadBlock") throw new Error("expected download");
    const updated = replaceBlock(withDownload, download.id, {
      ...download,
      title: "Checklist",
      file: { src: "/uploads/checklist.pdf" },
    });

    expect(updated.slice(0, 2)).toEqual(imported);
    expect(updated[2]).toMatchObject({ id: "download", title: "Checklist" });
  });

  it("postojeći FileDownloadBlock ostaje ista canonical instanca u svom panelu", () => {
    const existing: ContentBlock = {
      id: "legacy-file",
      type: "FileDownloadBlock",
      priority: 3,
      title: "PDF",
      file: { src: "/uploads/vodic.pdf" },
    };
    const all = [...imported, existing];
    expect(visibleContentBlocks(all, ["FileDownloadBlock"])[0]).toBe(existing);
  });
});
