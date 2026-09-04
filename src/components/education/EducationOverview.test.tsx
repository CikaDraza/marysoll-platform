import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EducationOverview from "./EducationOverview";

const useEducationContentList = vi.fn();
vi.mock("@/hooks/education/useEducationContent", () => ({
  useEducationContentList: () => useEducationContentList(),
}));

describe("Education overview creation entry", () => {
  beforeEach(() => {
    useEducationContentList.mockReturnValue({ data: [], isLoading: false });
  });

  it("drži prihvaćeni pregled i nudi sva tri jasna početka", () => {
    const html = renderToStaticMarkup(<EducationOverview />);
    expect(html).toContain("Pregled");
    expect(html).toContain("Vaši edukativni materijali i njihovo stanje.");
    expect(html).toContain("Napiši članak");
    expect(html).toContain("Uvezi dokument");
    expect(html).toContain("Dodaj video");
  });
});
