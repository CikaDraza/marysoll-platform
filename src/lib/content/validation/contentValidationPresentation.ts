import type {
  ContentBlockStatus,
  ContentValidationIssue,
} from "./contentBlockValidation";

const REQUIRED_MESSAGE: Record<string, string> = {
  "ArticleBlock:title": "Unesite naslov sekcije.",
  "ArticleBlock:paragraphs": "Nedostaje sadržaj.",
  "FeatureBlock:title": "Unesite naslov sekcije.",
  "FeatureBlock:sections": "Dodajte najmanje jednu sekciju.",
  "ContentSplitBlock:title": "Unesite naslov sekcije.",
  "ContentSplitBlock:content": "Nedostaje sadržaj.",
  "PricingBlock:title": "Unesite naslov sekcije.",
  "PricingBlock:items": "Dodajte najmanje jednu stavku.",
  "AffiliateCTABlock:title": "Unesite naslov poziva.",
  "AffiliateCTABlock:ctaLabel": "Unesite tekst dugmeta.",
  "AffiliateCTABlock:href": "Dodajte adresu dugmeta.",
  "VideoBlock:source": "Dodajte video.",
  "VideoBlock:source.url": "Dodajte video adresu.",
  "VideoBlock:source.media.src": "Dodajte video fajl.",
  "VideoBlock:*": "Dodajte video.",
  "TableBlock:columns": "Tabela nema kolone.",
  "TableBlock:rows": "Dodajte najmanje jedan red u tabelu.",
  "CalloutBlock:content": "Unesite tekst istaknute poruke.",
  "ChecklistBlock:items": "Dodajte najmanje jednu stavku.",
  "FileDownloadBlock:title": "Unesite naziv materijala.",
  "FileDownloadBlock:file": "Dodajte fajl za preuzimanje.",
  "FileDownloadBlock:*": "Dodajte fajl za preuzimanje.",
  "ImageGalleryBlock:images": "Galerija nema slike.",
};

export interface ContentStatusPresentation {
  label: string;
  detail?: string;
}

function actionableIssue(issue: ContentValidationIssue): string {
  const exact = REQUIRED_MESSAGE[`${issue.blockType}:${issue.path}`];
  if (exact) return exact;

  const root = issue.path.split(".")[0];
  return (
    REQUIRED_MESSAGE[`${issue.blockType}:${root}`] ??
    REQUIRED_MESSAGE[`${issue.blockType}:*`] ??
    (issue.code === "invalid_structure"
      ? "Proverite podatke u ovom bloku."
      : issue.message)
  );
}

/** Kratak, autoru razumljiv prikaz postojećeg canonical validation rezultata. */
export function contentStatusPresentation(
  status: ContentBlockStatus,
  issues: readonly ContentValidationIssue[],
): ContentStatusPresentation {
  switch (status) {
    case "VALID":
      return { label: "Spremno" };
    case "HIDDEN":
      return { label: "Sakriven" };
    case "INVALID":
      return {
        label: "Greška",
        detail: issues[0] ? actionableIssue(issues[0]) : "Proverite podatke u ovom bloku.",
      };
    case "INCOMPLETE":
      return {
        label: "Potrebno je dopuniti",
        detail: issues[0]
          ? actionableIssue(issues[0])
          : "Dopunite obavezni sadržaj bloka.",
      };
  }
}
