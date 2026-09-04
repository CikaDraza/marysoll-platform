import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createDraftContentBlock } from "@/lib/content/editor/blockFactories";
import { validateContentBlock } from "@/lib/content/validation/contentBlockValidation";
import { BlockCard } from "./BlockCard";

describe("BlockCard validation feedback", () => {
  it("prikazuje šta treba dopuniti i kada je kartica zatvorena", () => {
    const validation = validateContentBlock(
      createDraftContentBlock("VideoBlock", 1, () => "video"),
    );
    if (!validation.block) throw new Error("expected safe draft block");

    const html = renderToStaticMarkup(
      <BlockCard
        block={validation.block}
        status={validation.status}
        issues={validation.issues}
        selected={false}
        first
        last
        slugOptions={[]}
        onSelect={() => undefined}
        onChange={() => undefined}
        onMove={() => undefined}
        onToggleVisibility={() => undefined}
        onDuplicate={() => undefined}
        onDelete={() => undefined}
      />,
    );

    expect(html).toContain("Potrebno je dopuniti");
    expect(html).toContain("Dodajte video.");
    expect(html).not.toContain(">Nepotpun<");
  });
});
