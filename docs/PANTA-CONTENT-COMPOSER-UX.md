# Content Composer — shared authoring UX contract

## Granica

Content Composer uređuje semantički sadržaj. Ne poseduje Education, Newsletter,
Blog, Cloudinary, tenant authorization ili presentation temu. Host prosleđuje
controlled `blocks`, `onChange`, opcione CTA destinacije i opcioni
`ContentMediaAuthoringAdapter`.

Persisted discriminanti su PascalCase i čine jednu listu od 12 tipova:
`HeroBlock`, `ArticleBlock`, `FeatureBlock`, `ContentSplitBlock`, `PricingBlock`,
`AffiliateCTABlock`, `VideoBlock`, `TableBlock`, `CalloutBlock`,
`ChecklistBlock`, `FileDownloadBlock`, `ImageGalleryBlock`.

## Zajednički flow

Owner dodaje blok iz pickera, popunjava polja, menja redosled, sakriva ili
duplira blok i vidi mobile preview. Brisanje celog bloka traži potvrdu. Draft
može sadržati `INCOMPLETE` blok, ali ne malformed `INVALID` blok. Publish-ready
content prihvata samo `VALID` i `HIDDEN`. Isti contract je server write authority;
host ne sme da definiše sopstvenu block readiness semantiku.

`HIDDEN` čuva sadržaj i ne renderuje se. Incomplete/invalid blok ne obara preview,
već dobija jasnu placeholder dijagnostiku.

## Persistence lifecycle

```text
AUTHORING
→ draft validation
→ draft save
→ preview
→ publish validation
→ host persistence
→ public render
```

Draft save koristi `validateContentDocument(layout, "draft")` i dozvoljava
`VALID`, `INCOMPLETE` i `HIDDEN`, ali odbija `INVALID`. Publish koristi isti
validator u `publish` režimu i dozvoljava samo `VALID` i `HIDDEN`. Validation se
završava pre bilo kakve status/layout mutation. Neuspeh je HTTP 422 sa code
`CONTENT_VALIDATION_FAILED` i shared block/path issues.

Validation proverava originalni JSON, a host zatim persistira isti dozvoljeni
layout — Zod output se ne koristi kao silent transformacija. Postojeća
Newsletter integracija radi targeted update i jedan save, pa publish ne briše
`customCtas` ili druga landing polja koja ne poseduje.

Content Composer je authority za content readiness. Host ostaje authority za
permissions, lifecycle, storage i public exposure. Prazan layout trenutno
prolazi shared document validator; Newsletter client i dalje zahteva blok pre
publish-a. Globalno minimum-one-block pravilo ostaje eksplicitna product odluka.

## Media authoring contract

Blok čuva samo provider-neutral referencu:

```ts
type ContentAssetRef = {
  src: string;
  assetId?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
}
```

Slika dodaje obavezan `alt` i opcione `caption`, `width` i `height`. `blob:` i
`data:` URL ne smeju postati persisted sadržaj. Adapter hosta implementira
`upload(image | video | file, File)` i vraća trajni asset ref. Editor ne poznaje
endpoint, folder, provider, auth ili entitlement.

- Upload pokazuje indeterminate „Otpremanje…“; nema lažnog procenta.
- Replace menja ref tek kada upload uspe. Greška čuva prethodni ref.
- Remove uklanja samo draft referencu; ne poziva remote delete.
- Bez adaptera ostaje ručni unos trajnog URL-a.
- Trenutni Newsletter host mapira image/video na postojeće Cloudinary rute, a
  file na postojeći validirani admin attachment tok (JPG/PNG/WebP/PDF, 20 MB).

## Novi blokovi

- `VideoBlock`: bira YouTube, Vimeo ili upload; title/caption su opcioni. Loš ili
  nedostupan source degradira u čitljivu poruku i, kada postoji, link ka izvoru.
- `TableBlock`: kolone i redovi imaju stabilne ID-jeve; svaka ćelija je vezana za
  column ID. Add/remove/reorder čuvaju mapiranje. Renderer koristi caption,
  header scope i horizontalni overflow na uskom ekranu.
- `CalloutBlock`: `info`, `tip`, `important`, `warning`; značenje ima tekstualnu
  oznaku/simbol i nije preneto samo bojom.
- `ChecklistBlock`: stable-ID koraci sa add/remove/reorder ponašanjem; renderer je
  semantička lista.
- `FileDownloadBlock`: naslov, opis, file ref i opcioni CTA label. Bez fajla nema
  lažnog download CTA-a. Uploadovani naziv sugeriše naslov samo ako je prazan.
- `ImageGalleryBlock`: stable-ID slike, obavezan alt, opcioni caption i
  add/replace/remove/reorder. Responsive neutralna grid prezentacija.

## Postojeća image polja

Hero (do četiri slike), Article, svaka Feature sekcija, ContentSplit i
AffiliateCTA koriste isti `ImageMediaField`: URL/upload, replace, remove, alt i
caption. Hero dodatno podržava add i reorder. Stari `{src, alt}` dokumenti ostaju
validni.

## Namerno odloženo

Faza 2 ne uvodi Media Library, remote-delete lifecycle, stvarni progress API,
DOCX backend politiku, download authorization/analytics, theme-specific
renderere, Education rute, AI generaciju novih blokova ni merge strategiju za
Newsletter FULL REGENERATE. Newsletter/Blog authoring dokumentacija je sledeći
task, a capability wiring pripada F3.
