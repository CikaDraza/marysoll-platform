// lib/standardNewsletterVariables.ts
import { NewsletterVariable } from "@/types";

export const standardNewsletterVariables: NewsletterVariable[] = [
  {
    name: "clientName",
    label: "Ime klijenta",
    type: "text",
    placeholder: "npr. Ana (Sistem generise ime)",
  },
  {
    name: "campaignName",
    label: "Naziv kampanje",
    type: "text",
    required: true,
    placeholder: "npr. Letnja akcija 2025",
  },
  {
    name: "previewText",
    label: "Preview tekst (u inboxu)",
    type: "text",
    placeholder: "npr. Iskoristite 30% popusta na sve usluge!",
  },
  {
    name: "title",
    label: "Glavni naslov (npr. savet meseca)",
    type: "text",
    placeholder: "npr. Kako održavati gel lak duže",
    defaultValue: "",
  },
  {
    name: "body",
    label: "Glavni tekst (opis saveta)",
    type: "textarea",
    placeholder: "Ovde napišite detaljan opis saveta ili novosti...",
    defaultValue: "",
  },
  {
    name: "discount",
    label: "Popust / ponuda",
    type: "text",
    placeholder: "npr. 30% popusta",
  },
  {
    name: "location",
    label: "Lokacija dogadjaja",
    type: "text",
    placeholder: "npr. Bor, Sportska hala",
  },
  {
    name: "tickets",
    label: "Ulaz",
    type: "text",
    placeholder: "npr. slobodan / cena 2.500,00 din.",
  },
  {
    name: "startEvent",
    label: "Datum početka događaja",
    type: "datetime-local",
  },
  {
    name: "startDate",
    label: "Datum početka akcije",
    type: "date",
  },
  {
    name: "endDate",
    label: "Datum kraja akcije",
    type: "date",
  },
  {
    name: "mainImage",
    label: "Glavna slika",
    type: "image",
    placeholder: "URL slike (npr. iz Cloudinary)",
  },
  {
    name: "subtitle",
    label: "Podnaslov ili uvod u listu",
    type: "text",
    placeholder: "npr. 3 ključna saveta za savršen izgled",
    defaultValue: "",
  },
  {
    name: "itemOne",
    label: "Stavka 1 (lista)",
    type: "text",
    placeholder: "npr. Koristite kvalitetan top coat",
    defaultValue: "",
  },
  {
    name: "itemTwo",
    label: "Stavka 2 (lista)",
    type: "text",
    placeholder: "npr. Izbegavajte vruću vodu prvih 24h",
    defaultValue: "",
  },
  {
    name: "itemThree",
    label: "Stavka 3 (lista)",
    type: "text",
    placeholder: "npr. Nosite rukavice pri kućnim poslovima",
    defaultValue: "",
  },
  {
    name: "ctaText",
    label: "Tekst dugmeta",
    type: "text",
    placeholder: "npr. Zakaži sada",
    defaultValue: "",
  },
  {
    name: "ctaSlug",
    label: "Slug dugmeta",
    type: "text",
    placeholder: "npr. /termini, /usluge/manikir, /promocije",
    defaultValue: "",
  },
];
