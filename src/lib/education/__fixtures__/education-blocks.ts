import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";

/**
 * Po jedan kompletan primer svakog od 12 shared blokova. Education host ne sme
 * imati sopstvene blokove, pa ova lista mora ostati identična registry-ju.
 */
export const ALL_TWELVE_BLOCKS: ContentBlock[] = [
  {
    id: "hero",
    type: "HeroBlock",
    priority: 1,
    title: "Estetika lica",
    subtitle: "Šta stvarno pomaže koži",
    images: [{ src: "https://cdn.example.com/hero.jpg", alt: "Tretman lica" }],
  },
  {
    id: "article",
    type: "ArticleBlock",
    priority: 2,
    title: "Uvod",
    paragraphs: ["Koža reaguje sporije nego što očekujemo."],
    image: { src: "https://cdn.example.com/uvod.jpg", alt: "Nega" },
  },
  {
    id: "feature",
    type: "FeatureBlock",
    priority: 3,
    title: "Tri principa",
    intro: "Redosled je važniji od broja proizvoda.",
    sections: [
      {
        title: "Čišćenje",
        paragraphs: ["Blago i kratko."],
        items: ["Ujutru", "Uveče"],
      },
    ],
  },
  {
    id: "split",
    type: "ContentSplitBlock",
    priority: 4,
    title: "Pre i posle",
    content: "Razlika se vidi tek posle nekoliko nedelja.",
    image: { src: "https://cdn.example.com/split.jpg", alt: "Poređenje" },
    reverse: true,
  },
  {
    id: "pricing",
    type: "PricingBlock",
    priority: 5,
    title: "Tretmani",
    items: [
      {
        title: "Konsultacija",
        price: { amount: 3000, currency: "RSD" },
        features: ["Analiza kože"],
      },
    ],
  },
  {
    id: "affiliate",
    type: "AffiliateCTABlock",
    priority: 6,
    title: "Preporučeni proizvod",
    ctaLabel: "Pogledaj",
    href: "https://example.com/proizvod",
  },
  {
    id: "video",
    type: "VideoBlock",
    priority: 7,
    title: "Demonstracija",
    caption: "Korak po korak",
    source: { provider: "youtube", url: "https://youtu.be/abc123" },
  },
  {
    id: "table",
    type: "TableBlock",
    priority: 8,
    title: "Poređenje",
    columns: [{ id: "a", label: "Tretman" }],
    rows: [{ id: "r", cells: { a: "Nega" } }],
  },
  {
    id: "callout",
    type: "CalloutBlock",
    priority: 9,
    variant: "warning",
    title: "Stručna ograda",
    content: "Ovaj tekst ne zamenjuje pregled kod lekara.",
  },
  {
    id: "checklist",
    type: "ChecklistBlock",
    priority: 10,
    title: "Pitanja za konsultaciju",
    items: [{ id: "i1", text: "Koliko dugo traje oporavak?" }],
  },
  {
    id: "file",
    type: "FileDownloadBlock",
    priority: 11,
    title: "Vodič u PDF-u",
    description: "Za štampu",
    file: { src: "https://cdn.example.com/vodic.pdf", fileName: "vodic.pdf" },
  },
  {
    id: "gallery",
    type: "ImageGalleryBlock",
    priority: 12,
    title: "Primeri",
    images: [
      {
        id: "g1",
        src: "https://cdn.example.com/primer.jpg",
        alt: "Rezultat",
        caption: "Posle tretmana",
      },
    ],
  },
];
