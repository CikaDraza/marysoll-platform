# PANTA — Newsletter / Blog authoring i lifecycle contract

> **Status:** CURRENT stanje auditovano; TARGET granice zaključane; implementacija
> novog Newsletter UI-ja nije deo ovog dokumenta.
> Poslednja izmena: 2026-08-28 · `staging/production-engines`
>
> Shared block/edit/validation ugovor ostaje u
> [PANTA-CONTENT-COMPOSER-UX.md](PANTA-CONTENT-COMPOSER-UX.md). Education luk
> ostaje u [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md).

## 1. Purpose

Ovaj dokument zaključava stvarni Newsletter + Blog authoring sistem pre daljeg
razvoja. Razdvaja ono što kod radi danas (**CURRENT**), željeno ponašanje
(**TARGET**) i rad koji namerno nije deo ovog slice-a (**DEFERRED**).

Glavna granica je:

```text
CONTENT AUTHORING
        ↓
NewsletterCampaign host danas
        ↓
       / \
      /   \
PUBLIC WEB  EMAIL DISTRIBUTION
publish      send / schedule
```

`Blog` danas koristi `NewsletterCampaign` kao storage host. To je legacy
implementaciona činjenica, ne domenska jednakost `Blog === email`.

## 2. Terminology

- **Campaign** — `NewsletterCampaign` zapis: identitet, email sadržaj i
  distribucija, plus opcioni landing/blog payload.
- **Email content** — `campaign.content`, HTML koji se personalizuje i šalje.
- **Landing/blog content** — `campaign.landingPage.layout`, niz od 12
  Content Composer blokova.
- **Web publish** — promocija landing statusa na `published`; nije slanje
  email-a.
- **Email send** — distribucija `campaign.content`; nije objavljivanje web
  sadržaja.
- **Draft save** — upis trenutnog landing layouta uz draft validaciju i rezultat
  `landingPage.status = "generated"`.
- **FULL REGENERATE** — današnja akcija `Generate landing` kada layout već
  postoji; generisani rezultat zamenjuje kompletan lokalni layout.

## 3. Current architecture

**CURRENT — dokazano u kodu**

```text
AdminNewsletterDashboard
  ├─ template/import/AI email HTML → campaigns/create
  ├─ email preview → campaign.content
  ├─ send/pause/resume/stop/delete
  └─ AdminSemanticModal
       ├─ semantic metadata
       ├─ optional AI landing generation
       ├─ LandingBlocksEditor → shared Content Composer
       ├─ PreviewRenderer → shared BlockList
       ├─ save → landingPage.status=generated
       └─ publish → landingPage.status=published

NewsletterCampaign
  ├─ content                         email source
  ├─ status/scheduledFor/audience    email lifecycle
  └─ landingPage.layout/seo/status   web publication source

Public tenant
  ├─ /blogs                          listing
  └─ /blog/{slug} or /blogs/{slug}   detail aliases → same renderer
```

`CampaignLayoutEngine` i campaign preview oba završavaju u shared `BlockList` i
block registry-ju. Theme/Layout sloj ne uređuje niti validira body sadržaj.

## 4. Data ownership

### Content Composer owns

- canonical `ContentBlock` contract i 12 persisted discriminanata;
- add/edit/delete/hide/show/duplicate/reorder operacije;
- block readiness i draft/publish validaciju;
- semantic renderer (`BlockList` + registry);
- provider-neutral `ContentMediaAuthoringAdapter` contract.

### NewsletterCampaign owns

- campaign identitet, tenant/platform scope, naziv, subject i preview text;
- email HTML source (`content`), recipient izbor i email lifecycle;
- scheduling, send status i delivery brojače;
- Newsletter semantic/audience podatke;
- današnji storage host za `landingPage.layout`.

### Blog publication owns

- javnu vidljivost, landing status i enabled gate;
- slug i public SEO metadata;
- listing mapiranje, detail lookup i 404 ponašanje.

### AI owns

- opcionu pomoć: email template, slike, landing predlog, SEO i layout optimizer;
- nikada manual content authority.

### Theme/Layout Engine owns

- presentation shell i render dispatch;
- **ništa** od body authoringa, block contracta, readiness-a ili persistence-a.

`EducationContent` se ovim dokumentom ne uvodi i ne menja.

## 5. Current creation flow

**CURRENT**

```text
admin bira default/custom email template
→ popunjava name + subject + email HTML/variables
→ bira all/manual recipients i opcioni scheduledFor
→ POST /api/newsletter/campaigns/create
→ NewsletterCampaign(status=draft|scheduled, campaignType=email-only default)
→ Semantic / Landing modal
→ izbor email-only ili email-landing
→ manual layout ili AI predlog
→ Save
→ tek tada persisted campaignType postaje email-landing
```

Admin create forma ne šalje `campaignType`; model zato kreira `email-only`.
Kreiranje zahteva newsletter template i email polja čak i kada je stvarna namera
samo javni Blog. Modal je na dashboardu dostupan samo dok je email campaign
status `draft` ili `scheduled`.

Promena selecta na `email-landing` je prvo samo lokalna. Publish ruta proverava
persisted `campaign.campaignType`, pa novi zapis mora prvo da se sačuva; direct
Publish pre Save može vratiti `400 Campaign is not landing-enabled`.

`PATCH .../semantic` postoji kao opšti semantic update endpoint i hook, ali
primarni modal save koristi uži `.../save` tok. Semantic endpoint može zameniti
ceo nested `landingPage` payload i nije Content Composer write authority.

## 6. Manual authoring

**CURRENT**

```text
existing landingPage.layout ili []
→ AdminSemanticModal local preview state
→ LandingBlocksEditor compatibility wrapper
→ shared Content Composer
→ add / edit / delete / hide / reorder / duplicate
→ per-block draft diagnostics
→ shared PreviewRenderer / BlockList
```

Prazan lokalni layout sada može ručno da dobije prvi blok; AI tehnički nije
preduslov za Content Composer. Međutim, host flow i dalje prvo zahteva kreiranje
email kampanje i UI tekst `Generate landing` ostaje dominantan.

Manual izmene menjaju samo lokalni preview dok korisnik ne izabere Save ili
Publish. Closing bez upisa vraća sledeće otvaranje na persisted layout.

**TARGET**

```text
Novi sadržaj
→ namena koju host zaista podržava
→ [Počni od praznog] ili [Pomozi mi uz AI]
→ isti Content Composer
→ Save Draft
→ Preview
→ nezavisna web publish i/ili email distribution akcija
```

Manual-first i AI-assisted put moraju završiti u istom editoru i istom
validation contractu.

## 7. AI-assisted authoring

**CURRENT**

`POST /api/campaigns/{id}/preview` proverava admin/scope i `aiLandingPages`
entitlement, prihvata semantic intent/summary/tone, dozvoljene slike i custom
CTA-jeve. `landingPageAgent` generiše samo originalnih šest blokova. CTA agent
ne upisuje proizvoljan `href`: bira `ctaKey`, a server ga razrešava kroz catalog
ili validan campaign custom CTA. Slike moraju biti iz prosleđenog allowlista.

`buildCampaignLayout` ponovo parsira, sanitizuje i score-uje AI rezultat. Zatim
se SEO automatski traži preko `generate-seo`; SEO neuspeh ne obara layout
generation. Rezultat je i dalje samo lokalni preview do Save/Publish.

AI ne generiše šest F2B blokova i nije potreban za njihovo ručno authoring.

**TARGET**

AI je eksplicitna opciona početna pomoć ili eksplicitna destruktivna zamena.
Nikada tiho ne prepisuje ručni sadržaj i nikada ne zaobilazi server validation.

## 8. Draft save

**CURRENT**

```text
editor state
→ useCampaignSemantic.saveCampaign
→ PATCH /api/newsletter/campaigns/{id}/save
→ auth + scope + newsletterLanding feature
→ validateContentDocument(layout, "draft") PRE mutation
→ targeted landing/semantic fields
→ landingPage.enabled=true
→ landingPage.status="generated"
→ regeneratedCount + 1
→ one campaign.save()
```

Draft matrica:

| Block status | Save |
|---|---:|
| `VALID` | dozvoljen |
| `INCOMPLETE` | dozvoljen |
| `HIDDEN` | dozvoljen |
| `INVALID` | odbijen, HTTP 422, bez mutation |

Save čuva originalni validirani JSON, ne Zod-transformisanu kopiju. Targeted
update ne briše landing polja koja ruta ne poseduje. `generatedAt` se osvežava,
a `regeneratedCount` trenutno raste na svakom Save-u — naziv zato ne meri samo AI
regeneracije.

Najvažnije: Save **bezuslovno** vraća i ranije objavljen landing sa `published`
na `generated`.

## 9. Preview

**CURRENT**

Postoje dva odvojena preview-a:

- dashboard `Preview` renderuje sanitizovani `campaign.content` kao email HTML;
- Semantic/Landing modal renderuje lokalni `landingPage.layout` kroz shared
  `PreviewRenderer` / `BlockList` i prikazuje SEO panel.

Landing preview nije javni draft URL. Lokalni state može biti noviji od baze.
Incomplete/invalid block dobija editor placeholder umesto pada celog preview-a.

## 10. Web publish

**CURRENT**

```text
editor layout
→ usePublishLanding
→ PATCH /api/newsletter/campaigns/{id}/publish
→ auth + scope + newsletterLanding feature
→ persisted campaignType mora biti email-landing
→ validateContentDocument(layout, "publish") PRE mutation
→ targeted landing fields + status="published"
→ one campaign.save()
→ publishedBlogFilter ga čini javnim
```

Publish matrica:

| Block status | Publish |
|---|---:|
| `VALID` | dozvoljen |
| `HIDDEN` | dozvoljen |
| visible `INCOMPLETE` | odbijen, HTTP 422 |
| `INVALID` | odbijen, HTTP 422 |

Web publish ne menja email campaign `status` i ne šalje email.

### Empty document

- **SHARED CONTRACT:** `[]` je validan dokument i u draft i publish režimu.
- **CURRENT NEWSLETTER CLIENT:** Publish dugme je disabled bez layouta, a
  `handlePublish` dodatno zahteva najmanje jedan blok.
- **CURRENT NEWSLETTER SERVER:** publish ruta nema host minimum i prihvata `[]`.
- **GAP / TARGET:** server Newsletter host treba da sprovede isti minimum kao
  client. Ako proizvod zahteva sadržaj, minimum treba precizirati kao najmanje
  jedan **visible publish-valid** blok, bez menjanja shared validatora.

## 11. Email send and schedule

**CURRENT**

```text
NewsletterCampaign.content (email HTML)
→ send now ili scheduled status
→ recipient resolution
→ placeholder personalization + tracked CTA/open URLs
→ Resend batch delivery
→ NewsletterLog per recipient
→ sent/bounce counters + final campaign email status
```

Create sa budućim `scheduledFor` odmah postavlja email status `scheduled`.
Scheduler uzima due kampanje i stale `sending` recovery kandidate, atomically ih
lockuje na `sending`, šalje i završava kao `sent` ili `failed`.

Ručni send endpoint podržava `send`, `pause`, `resume` i `stop`. Primaoci su
platform audience kontakti, tenant verified/subscribed korisnici i kontakti ili
ručna lista. Delivery preskače već logovane adrese, pa recovery ne šalje ponovo
istim primaocima.

Create forma i model čuvaju `excludeRecentSubscribers` i `excludeInactive`, ali
`sendCampaignEmails` trenutno ne čita ta polja pri recipient resolution-u.
Checkboxi zato danas ne menjaju stvarni delivery skup.

Za `email-landing`, email CTA vodi na landing URL. Email body ipak dolazi iz
`campaign.content`; javni body dolazi iz `landingPage.layout`. To su različiti
izvori i različiti lifecycle-i.

Dashboard akcija `Pokreni sada` nad buduće zakazanom kampanjom ne poništava
`scheduledFor`: send ruta je ostavlja u `scheduled`. Labela je zato trenutno
neprecizna.

## 12. Blog listing and detail

**CURRENT — listing**

- javna listing ruta je `/blogs` (path-based okruženje dodaje tenant slug);
- klijent poziva `/api/public/{tenantSlug}/blog-posts?page=&limit=`;
- default listing je 9 po strani, API limit je maksimalno 50;
- upit je tenant-scoped i sortira `createdAt` opadajuće;
- homepage `content.blog` loader koristi isti konceptualni source i uzima 3
  posta server-side bez hydration waterfall-a.

Jedini javni filter je:

```ts
{
  tenantId,
  campaignType: "email-landing",
  "landingPage.enabled": true,
  "landingPage.status": "published"
}
```

`mapBlogPost()` puni karticu ovako:

| Card field | Source |
|---|---|
| slug | normalized `landingPage.slug` |
| title | `seo.title`, fallback `campaign.name` |
| description | `seo.description` |
| date | `campaign.createdAt` |
| category | `landingPage.semanticType`, fallback `blog` |
| image | `seo.ogImage` |
| fallback avatar | initials iz title-a |

**CURRENT — detail i routing**

Listing komponente nisu ujednačene: osnovni i theme-8 listing linkuju
`/blog/{slug}`, dok theme-3/theme-9 koriste `/blogs/{slug}`. Proxy danas oba
oblika prepisuje na interni `src/app/tenant/blogs/[...slug]` catch-all, pa su oba
aktivna detail ulaza. Nema uočenog redirecta koji bira jedan canonical oblik.

```text
/blog/{slug} ili /blogs/{slug}
→ tenant proxy + tenant headers
→ getCampaign(fullPath, tenantId)
→ isti publishedBlogFilter + tolerantna slug normalizacija
→ landingPage.layout
→ CampaignClientShell
→ CampaignLayoutEngine
→ BlockList
→ block registry
```

`getCampaign` prihvata legacy varijante sa/bez leading slash-a, `blog/` prefiksa
i `ctaSlug` fallback. Generated, pending, failed, disabled, email-only i tuđi
tenant sadržaj nisu čitljivi. Detail za takav sadržaj završava sa 404.

**TARGET:** izabrati jedan public detail canonical URL, zadržati kompatibilni
redirect sa drugog oblika i uskladiti sve theme linkove. Izbor nije deo ovog
docs taska.

## 13. SEO

**CURRENT**

`landingPage.seo` čuva `title`, `description`, `keywords`, `ogTitle`,
`ogDescription` i `ogImage`. Slug, `semanticType`, audience i editorialCategory
su takođe host/publication metadata, ne blokovi.

`generate-seo` zahteva neprazan layout, izvlači tekst iz blokova i vraća strict
parsiran AI SEO rezultat; sam endpoint ga ne persistira. Landing generation ga
poziva automatski i Save/Publish zatim upisuju rezultat. UI omogućava izbor
`ogImage` iz generisanih slika, ali nema kompletan manual editor za SEO title i
description.

Detail `generateMetadata()` koristi persisted SEO za HTML title, description,
keywords i Open Graph. Listing koristi isti SEO projection.

**LOCKED:** SEO pripada host/publication sloju. `SEO` nije `ContentBlock` i
Content Composer ne postaje njegov vlasnik. Education kasnije može slediti isti
princip bez deljenja `NewsletterCampaign` modela.

## 14. Media

**CURRENT**

```text
Content Composer
→ ContentMediaAuthoringAdapter.upload(kind, File)
→ Newsletter host adapter
   image → /api/cloudinary/images
   video → /api/cloudinary/videos
   file  → /api/admin/chat/upload
→ provider-neutral ContentAssetRef u bloku
→ persisted layout
→ public renderer koristi src/ref
```

Content block ne poznaje Cloudinary, auth, entitlement ili tenant folder.
Replace postaje vidljiv tek posle uspešnog uploada; remove uklanja draft ref i ne
briše remote asset.

Odvojeni legacy/AI image flow (`generate-images` i `useGeneratedImages`) pravi
sliku i Cloudinary URL za AI landing input/OG izbor. Njegova remove akcija može
pozvati `delete-image`; to nije novi shared media contract.

**DEFERRED:** Media Library, reference counting, remote orphan cleanup,
download authorization/analytics i unified asset lifecycle.

## 15. Validation and error UX

**CURRENT**

Server `validateContentDocument(values, "draft" | "publish")` je jedini write
authority za Content Composer readiness. Hidden blok može biti content-incomplete
i ostati `HIDDEN`, ali malformed struktura — dupli stable ID-jevi, table cell
map mismatch, video provider/URL mismatch ili transient media ref — ostaje
`INVALID` i ne može se ni draft-save-ovati ni publish-ovati.

Failure odgovor je:

```json
{
  "error": "Content validation failed",
  "code": "CONTENT_VALIDATION_FAILED",
  "validation": {
    "mode": "draft | publish",
    "valid": false,
    "blocks": [],
    "issues": []
  }
}
```

HTTP status je 422 i mutation se ne dešava. Client trenutno toast-uje prvu
grešku kao `blockType · path: message`; editor paralelno prikazuje per-block
draft dijagnostiku. Nema summary-ja svih publish prepreka niti focus/scroll do
prvog problematičnog polja.

## 16. Editing published content

**CURRENT — potvrđen problem**

```text
PUBLISHED POST
→ otvori editor (samo dok je email status draft/scheduled)
→ izmeni
→ Save
→ landingPage.status = generated
→ publishedBlogFilter više ne nalazi zapis
→ post odmah nestaje sa listinga i detail vraća 404
→ Publish ga vraća javno
```

Ovo je postojeća host lifecycle semantika, ne F2C regresija. Jedan layout je
istovremeno draft i live copy; nema last-published snapshot-a ni revisions.

### Opcija A — zadržati sadašnje ponašanje

Najmanji tehnički trošak: nema schema/read promene. Cena je javni downtime
između Save i republish, iznenađujući UX i rizik da post ostane slučajno skinut.

### Opcija B — odvojeni durable draft i last-published snapshot

Live verzija ostaje dostupna dok se novi draft čuva. Publish atomski promoviše
validiran draft. Cena: nova persistence polja ili publication zapis, migracija
postojećih layout/SEO podataka, odvojeni save/publish targeti, public read nad
live snapshotom i jasna delete/unpublish semantika. Ovo nije pun revision engine,
ali kasnije može dobiti revisions.

### Opcija C — nema persistent drafta za published post

Izmene ostaju samo lokalne do atomic Publish. Backend promena je manja od B i
live post ne nestaje, ali refresh/close gubi rad, nema nastavka na drugom uređaju
ni pouzdane saradnje i dugi članci postaju rizični.

**RECOMMENDATION / TARGET:** Opcija B u zasebnom implementation slice-u. Ona
čuva javni kontinuitet i durable authoring bez obaveze da odmah uvodimo revision
history. Do tada UI mora eksplicitno upozoriti da Save skida objavljeni post.

## 17. FULL REGENERATE behavior

**CURRENT — stvarni code path**

`Generate landing` nema poseban regenerate label ni confirmation. AI rezultat
se pretvara u novi `LandingPreviewResult`, a `setLayout(result)` i
`setAiLanding(result)` zamenjuju ceo lokalni state.

Zato iz lokalnog layouta nestaju:

- svi ručno uređeni originalni blokovi koje AI nije vratio;
- ručno dodati Video/Table/Callout/Checklist/FileDownload/ImageGallery blokovi;
- hidden blokovi;
- media refs vezani samo za zamenjene blokove;
- lokalni SEO, kada ga novi generation/SEO rezultat zameni.

Pre Save/Publish persisted kopija još postoji: closing/reopen može vratiti
poslednji saved layout. Posle Save/Publish nema undo, revision ni recovery.
Remote asset ne mora biti obrisan, ali njegov ref može postati orphan. Optimize
layout je takođe replace lokalnog layouta kada score poraste.

**TARGET**

```text
FULL REGENERATE (destructive replace)
→ jasno destruktivna labela
→ confirmation
→ tačna poruka da se ceo manual layout zamenjuje
→ Cancel ili potvrđeni replace
```

Merge algoritam nije potreban za ovaj contract. AI ne postaje authority nad
ručnim sadržajem.

## 18. Delete and unpublish behavior

**CURRENT**

- `Obriši Landing` poziva DELETE landing endpoint bez confirmation-a u modalu;
- endpoint resetuje layout na `[]`, `enabled=false`, status `pending`, SEO/score
  i generation metadata, ali zadržava Campaign/email podatke;
- brisanje landinga zato uklanja objavu sa javnog Bloga;
- nema posebne `Unpublish` akcije koja bi sačuvala layout i samo ugasila public
  exposure;
- `Obriši` campaign u dashboardu ima browser confirmation, briše ceo campaign i
  nije ponuđen dok je email status `sending`;
- nijedan od ova dva toka ne garantuje remote media cleanup.

**TARGET:** razdvojiti `Unpublish` (reversible public state), `Delete landing`
(content deletion) i `Delete campaign` (host record deletion), sa confirmation
tekstom koji navodi tačan scope i recovery mogućnost.

## 19. Known UX and contract debt

**CURRENT gaps**

1. Create je email-first i nema pravi Blog-only entry point.
2. Save objavljenog posta pravi public downtime do republish-a.
3. Editor nije dostupan kada email status više nije draft/scheduled, iako je web
   lifecycle konceptualno nezavisan.
4. Promena na email-landing mora prvo Save pre prvog Publish-a.
5. Client odbija empty publish, server ga prihvata.
6. FULL REGENERATE nema destruktivnu labelu, confirmation ni durable recovery.
7. `/blog/{slug}` i `/blogs/{slug}` koegzistiraju bez canonical redirecta.
8. SEO nema kompletan manual edit tok; AI je praktično jedini generator.
9. `regeneratedCount` broji Save operacije, ne samo regeneracije.
10. Landing delete nema confirmation niti zaseban unpublish.
11. Validation toast prikazuje samo prvu grešku.
12. `semantic` endpoint ima širi nested replacement contract od save/publish
    write authority-ja.
13. `Pokreni sada` ne zaobilazi budući `scheduledFor` i labela može da zavara.
14. Blog kartica koristi campaign `createdAt`, ne publication/update datum.
15. `excludeRecentSubscribers` i `excludeInactive` se persistiraju, ali ih
    recipient resolver ne primenjuje.

## 20. Target UX

**TARGET — zaključan pravac, nije trenutni UI**

```text
Novi sadržaj
→ host prikazuje samo stvarno podržane namene
→ Počni od praznog | Pomozi mi uz AI
→ jedan Content Composer
→ Save Draft (bez skidanja live snapshot-a)
→ Preview
→ Publish Web
→ opciono Send/Schedule Newsletter
```

Namena mora biti precizno modelovana pre nego što UI ponudi tri izbora:

| Namena | CURRENT | TARGET | GAP |
|---|---|---|---|
| Newsletter only | `email-only` | eksplicitan email-only flow | postoji, ali je spojena create forma |
| Blog + Newsletter | `email-landing` + Publish i Send kao odvojene akcije | oba izlaza jasno prikazana | lifecycle postoji, UX ih ne objašnjava |
| Blog only | može se operativno publish-ovati `email-landing` bez slanja | eksplicitna namena bez obaveznog email authoringa | enum/create contract je ne modeluju |

Ne dodavati lažni `Blog only` toggle dok persistence/create contract ne može da
ga predstavi bez placeholder email sadržaja. Novi model nije potreban samo radi
terminologije; prvo treba odabrati najmanji backward-compatible host contract.

## 21. Explicitly deferred

- novi Newsletter/Blog UI i nova campaign taxonomy;
- novi Blog model ili `EducationContent` reuse;
- durable draft/live snapshot implementacija i revision history;
- optimistic locking i saradnja više autora;
- AI merge algoritam i generisanje F2B blokova;
- Media Library i orphan cleanup;
- email/scheduler redesign;
- theme redesign, homepage i client panel;
- Education F3 wiring i sve Education content rute;
- Booking i Consultation promene.

## 22. Implementation priorities

1. **Published-edit safety:** implementirati odvojeni durable draft i
   last-published snapshot (Opcija B), uz migraciju i atomic publish.
2. **Host publish parity:** server-side Newsletter minimum-one-visible-block
   precondition i regression test.
3. **Destructive action clarity:** FULL REGENERATE i landing delete confirmation;
   zaseban reversible Unpublish.
4. **Purpose contract:** backward-compatible Blog-only / Newsletter-only / Both
   model i tek zatim manual-first create UI.
5. **Public URL canonicalization:** izabrati `/blog/{slug}` ili `/blogs/{slug}` i
   redirectovati alias; uskladiti theme linkove.
6. **Authoring quality:** full manual SEO, validation summary/focus i editor
   pristup nezavisan od email delivery statusa.
7. Newsletter/Blog contract je sada dovoljan boundary gate za sledeći Education
   slice: F3 capability wiring može da nastavi nezavisno, ali ne sme
   retroaktivno menjati ovaj host lifecycle. Stavke 1–6 ostaju zasebni
   Newsletter/Blog implementation prioriteti.
