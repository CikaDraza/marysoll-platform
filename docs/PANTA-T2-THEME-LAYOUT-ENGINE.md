# PANTA T2 — Theme/Layout Engine granica (odluka 2026-08-16, rev. v0.2)

> Grana: `product-engines/theme-engine/layout-contract`.
> **v0.2 (Architecture Review):** dodati `LayoutDefinition`/`SectionDefinition`
> (bez njih slot contract ne postoji), `schemaVersion` po bloku, invarijante
> immutable published revizija, server-side block loaderi (zabrana waterfall-a) i
> dvostruka politika za nepoznat blok (render skip / publish error).
> **v0.2.1:** dodat T2A.3 Composition Inventory (6.1) i odluka da se generički
> `<ThemeSections />` ne uvodi prerano (6.2).
> **v0.2.2:** FeatureBlockRegistry (6.3) + odluka o `always` slučajevima: T2A ih
> zadržava kroz izbrisiv compat sloj, normalizacija je zaseban posao
> (T2A-FOLLOWUP, 6.4).
> T2 iz [ARHITEKTURA-ENGINES.md](../ARHITEKTURA-ENGINES.md), podeljen na
> **T2A (Theme/Layout boundary)** i **T2B (Tenant verticals + capabilities,
> vidi [PANTA-TENANT-VERTICALS-CAPABILITIES.md](PANTA-TENANT-VERTICALS-CAPABILITIES.md))**.
> Okidač: Education vertikala (Marina) — prvi tenant koji nije „salon = usluge + termini".

## 1. Zašto sada

Theme/Layout sloj **nije neutralan**. Danas zna da je Marysoll salon sa uslugama
i terminima. Dok je postojala jedna vertikala to je bilo neprimetno; sa
edukacijom postaje blokada.

Ako sada samo dodamo `educationEnabled`, `educationBookingEnabled`,
`educationPreviewEnabled`, `educationBannerEnabled`, za par meseci imamo isti
dug sa sledećom vertikalom. Zato T2A ne dodaje nijedan novi flag — **uklanja
kategoriju flagova**.

## 2. Zatečeno stanje (provereno u kodu 2026-08-16)

| Mesto | Šta je vezano za vertikalu |
|---|---|
| [`layouts/types.ts`](../src/components/themes/layouts/types.ts) `ThemeLandingProps` | `salon: SalonProfileData`, `services: IService[]`, `testimonials`, `tenantStats`, `salonWithMergedSocial` — domenski tipovi u props-u teme |
| isti fajl | 10 boolean flagova: `heroEnabled`, `aboutEnabled`, `servicesPreviewEnabled`, `appointmentEnabled`, `testimonialsEnabled`, `artistsEnabled`, `galleryEnabled`, `faqEnabled`, `blogEnabled`, `perksEnabled` + `effectiveGalleryVariant` |
| [`ThemeLayout.tsx`](../src/components/themes/ThemeLayout.tsx) l. 90–96 | flagovi se računaju iz `ls.landing.<sekcija>.enabled` i prosleđuju svakoj temi |
| `layouts/ThemeNLanding.tsx` (8 tema) | svaka tema ručno grana `{servicesPreviewEnabled && <ThemeNServices services={…} />}` |
| `LandingStructure` u [`types/index.ts`](../src/types/index.ts) l. 877+ | fiksan union sekcija (hero/about/servicesPreview/appointmentSection/…) sa CMS poljima |

Površina: **175 fajlova, ~1.2 MB** u `src/components/themes/`.

Posledica: nova vertikala danas znači dirati `ThemeLandingProps` + `ThemeLayout`
+ svih 8 tema. To je definicija loše granice.

## 3. Ciljna granica

```
Theme/Layout Engine
        │ ZNA: brand · design tokens · layout · sections · slots ·
        │      responsive rules · block placement · theme versions
        │
        │ NE ZNA: Service · EducationOffering · Campaign ·
        │         Appointment · Lead · Loyalty
        ▼
Feature Block Registry            (application layer)
        ├── services.catalog
        ├── booking.services
        ├── education.catalog
        ├── booking.education
        ├── distribution.banner
        ├── audience.lead_capture
        └── … budući feature-i
```

**Theme određuje GDE i KAKO se nešto prikazuje. Feature/Engine određuje ŠTA to
jeste i kako radi.**

## 4. Theme JSON kontrakt

Engine ne sme da zna nabrajanje tipova blokova — `type` je slobodan string koji
razrešava registry u aplikaciji.

```ts
interface LayoutBlock {
  id: string;
  type: string;          // npr. "education.catalog" — engine ga ne tumači
  schemaVersion: number; // verzija `config` sheme tog bloka
  slot: string;          // mora postojati u SectionDefinition.slots
  config?: unknown;      // validira feature schema, ne engine
}

interface LayoutSection {
  id: string;
  sectionType: string;   // referenca na SectionDefinition
  variant?: string;      // varijanta te definicije
  blocks: LayoutBlock[];
}

interface ThemeDocument {
  version: number;
  layoutDefinitionId: string;   // koji skup SectionDefinition-a važi
  brand: {
    logo?: string;
    colors: Record<string, string>;
    typography: Record<string, unknown>;
  };
  sections: LayoutSection[];
  lifecycle: "draft" | "published" | "archived" | "preview";
}
```

### 4.1 Layout/Section definicije — bez njih slot contract ne postoji

Engine ne može da tvrdi „slot `aside` ne postoji" ako nema gde da pogleda. Zato
uz dokument ide **definicija layout-a**, koju engine takođe vlada:

```ts
interface SectionDefinition {
  sectionType: string;
  variants: Record<string, { slots: SlotDefinition[] }>;
}

interface SlotDefinition {
  name: string;                 // "main" | "aside" | "cta" | …
  maxBlocks?: number;
  accepts?: "any" | string[];   // opciono ograničenje po block `type`
}

interface LayoutDefinition {
  id: string;                   // = ThemeDocument.layoutDefinitionId
  version: number;
  sections: SectionDefinition[];
}
```

`accepts` je **opciono i nije vertikalno znanje** — to je string lista koju
aplikacija puni iz registry-ja; engine je samo poredi.

### 4.2 Invarijante verzionisanja

- `published` i `archived` revizije su **immutable** — nikad se ne menjaju u mestu.
- Izmena objavljene teme = nova `draft` revizija sa `version + 1`.
- `publish` je **atomska zamena aktivne revizije** (stara ide u `archived`), tako
  da posetilac nikad ne vidi polustanje.
- `preview` revizija je vidljiva samo preko preview tokena i nikad ne postaje
  aktivna bez `publish`.
- `version` je monotono rastuć po tenantu; nema „ponovnog korišćenja" broja.

### 4.3 Šta engine validira

| Validira engine | Ne validira engine |
|---|---|
| jedinstvenost `id` unutar dokumenta | `config` sadržaj bloka (feature schema) |
| da `sectionType`/`variant` postoje u `LayoutDefinition` | da li podaci bloka postoje |
| da `slot` postoji u toj varijanti i poštuje `maxBlocks`/`accepts` | poslovna pravila vertikale |
| dozvoljene `lifecycle` prelaze i monotonost `version`-a | capability razrešenje (T2B) |
| da je `schemaVersion` bloka poznat registry-ju (kroz callback) | migraciju v1→v2 config-a |

## 5. Feature Block Registry (u aplikaciji, ne u paketu)

```ts
registerFeatureBlock({
  type: "services.catalog",
  schemaVersion: 1,
  capability: "services.catalog",
  schema: ServicesCatalogSchema,
  loader: loadServicesCatalog,   // server-side, vidi 5.2
  renderer: ServicesCatalogBlock,
});

registerFeatureBlock({
  type: "booking.education",
  schemaVersion: 1,
  capability: "booking.education",
  schema: EducationBookingSchema,
  loader: loadEducationBooking,
  renderer: EducationBookingBlock,
});
```

Registry drži i **migracije config-a** po tipu (`migrate: (config, fromVersion)`),
tako da stari `published` dokument sa `schemaVersion: 1` nastavlja da radi kada
blok pređe na v2 — bez diranja objavljenih revizija (4.2).

Renderer dobija samo svoj `config` i sopstvene podatke (kroz svoj engine/API) —
**ne** kroz `ThemeLandingProps`. Blok bez razrešene capability se ne renderuje
(vidi T2B).

**Ključni acceptance kriterijum T2:** novi engine ne sme da zahteva izmenu
Theme Engine paketa. Registruje blok i to je sve.

### 5.1 Dvostruka politika za nepoznat blok

| Kontekst | Ponašanje |
|---|---|
| **Public render** | skip + telemetry (nikad crash) — loš draft ne obara sajt |
| **Publish validacija** | **error** — nemoguće je objaviti dokument sa nepoznatim `type` ili nepoznatim `schemaVersion` |

Isto važi za blok čiji `schemaVersion` registry više ne podržava: na renderu se
preskače, na publish-u je greška.

### 5.2 Data loading — zabranjen waterfall

Vlasništvo nad podacima ide bloku, ali **N blokova ≠ N klijentskih fetch-eva**.
Danas `ThemeLayout` centralizuje pripremu i to se ne sme izgubiti:

- svaki blok registruje **server-side loader** (`loader(ctx) => data`);
- renderer strane skuplja loadere svih vidljivih blokova i izvršava ih
  **paralelno u jednom server prolazu**, sa request-scoped dedupe/cache
  (dva bloka koja traže isti resurs → jedan upit);
- klijentski fetch je izuzetak (interaktivni widget posle hydration-a), nikad
  podrazumevani način dolaska do podataka za prvi render;
- loader sme da vrati samo podatke svog domena — nema „uzmi sve o salonu".

Regresija performansi (LCP na tenant landing strani) je release gate za T2A
jednako kao vizuelna regresija.

## 6. Mapiranje zatečenog na blokove (T2A, bez promene ponašanja)

| Danas | Sutra |
|---|---|
| `heroEnabled` | sekcija `hero`, blok `content.hero` |
| `aboutEnabled` | blok `content.about` |
| `servicesPreviewEnabled` | blok `services.catalog` (capability `services.catalog`) |
| `appointmentEnabled` | blok `booking.services` (capability `booking.services`) |
| `testimonialsEnabled` | blok `content.testimonials` |
| `artistsEnabled` | blok `content.team` |
| `galleryEnabled` + `effectiveGalleryVariant` | blok `content.gallery`, varijanta u `config` |
| `faqEnabled` | blok `content.faq` |
| `blogEnabled` | blok `content.blog` |
| `perksEnabled` | blok `content.perks` |

`LandingStructure` ostaje kao **izvor podataka** u prelaznom periodu: adapter
`landingStructure → ThemeDocument` prevodi zatečeni CMS oblik u sekcije/blokove.
Tek kada sve teme čitaju `ThemeDocument`, CMS piše direktno u novi oblik.

## 6.1 CMS parity ≠ composition parity (T2A.3)

Adapter dokazuje da `ThemeDocument` nosi iste `enabled` odluke kao zatečeni
flagovi. To **nije** dokaz da tema danas renderuje baš te sekcije. Inventar svih
8 tema (`lib/platform/theme-composition.ts`, provereno protiv koda) pokazuje dva
odstupanja koja bi naivna migracija tiho promenila:

| Tema | Poštuje flagova | Renderuje bez obzira na CMS |
|---|---|---|
| theme-1 | 7 | — |
| **theme-2** | **2** | hero, about, servicesPreview, testimonials |
| theme-3 | 8 | — |
| theme-4 | 6 | — |
| **theme-5** | **2** | hero, about, servicesPreview, appointmentSection, gallery |
| theme-6 | 6 | — |
| theme-7 | 6 | appointmentSection (booking je slot u hero sekciji) |
| theme-8 | 7 | — (nema booking ni team sekciju) |

Uz to, svih 8 tema ima **theme-native** sekcije kojih uopšte nema u CMS-u
(pricing, social-proof, how-it-works, promo-banner, tribute…) i **shell** slojeve
(header/footer, Y2K preloader, background/doodle/sparkle, modal provider).

### Odluka

```
ThemeDocument         = konfigurabilni content/business blokovi
Theme Composition     = kako ih tema slaže + njeni presentation-only delovi
FeatureBlockRegistry  = kako se blok razrešava i puni podacima
```

**Theme-native elementi ostaju vlasništvo teme i ne postaju Feature Block-ovi.**
Theme8Tribute, graffiti sloj ili dekorativni CTA nisu poslovni feature-i i ne
treba ih na silu provlačiti kroz registry.

Migracija teme mora **svesno** da reši svaki `always` slučaj iz tabele: ili počne
da poštuje flag (promena ponašanja — traži odluku vlasnika), ili ga eksplicitno
zadrži bezuslovnim. Tiha promena nije dozvoljena.

## 6.2 Bez preranog `<ThemeSections />`

Generički linearni renderer se **ne uvodi** u T2A. Dok se ne pokaže da više tema
zaista deli isti raspored, per-theme kompozicija ostaje — menja se samo to
odakle blok dobija podatke:

```tsx
<ThemeBlock document={document} type="content.hero" />
<Theme1SocialProof />                                   {/* theme-native ostaje */}
<ThemeBlock document={document} type="services.catalog" />
```

Tema više ne zna za `services`, `salon`, `IService` ni `appointmentEnabled` —
kaže samo „ovde ide `services.catalog`". Registry razrešava podatke i renderer.
`<ThemeSections />` se izvlači tek kada inventar pokaže da se rasporedi poklapaju.

## 6.3 FeatureBlockRegistry (T2A.4)

`src/lib/platform/blocks/` — registry je u aplikaciji, engine ostaje neutralan.

| Fajl | Šta zna |
|---|---|
| `types.ts` | kontrakt registry-ja: config i podaci po tipu, `BlockDataSource`, `FeatureBlockDefinition` |
| `render-types.ts` | kontrakt jednog prolaza: `ResolvedBlock`, `origin`, razlozi preskakanja |
| `definitions.ts` | deset blokova iz tabele 6: shema config-a (zod), server loader, `capability: null` |
| `registry.ts` | lookup + `BlockTypeResolver` za engine (publish validacija) |
| `deps.ts` | request-scoped izvor podataka, memoizovan → dedupe |
| `resolve.ts` | paralelni prolaz: parse → `Promise.all(loaderi)` → mapa po `blockId` |

Dve odluke koje nisu bile u v0.2:

**Renderer se ne drži u registry-ju.** Osam tema ima osam prikaza istog bloka
(`content.hero` = Theme1Hero / Theme5Hero / Theme8Hero…). Registry drži ono što
je zajedničko — shemu, loader, capability — a prikaz ostaje vlasništvo teme.
Tema jednom prijavi mapu `tip → komponenta` kroz `<ThemeBlockScope>`, pa
`<ThemeBlock document type>` niže u stablu ostaje kratak. Mapa se definiše na
nivou modula; nova mapa po renderu bi remount-ovala blok.

**Loaderi u T2A ne uvode nijedan nov upit.** `ClientHomePage` već povlači
salon/services/testimonials u jednom server prolazu, pa se koristi
`preloadedBlockDataSource(...)`: loader dobija iste podatke, samo kroz svoj
kontrakt. Kada blok dobije stvarnu autonomiju, isti kontrakt puni
`createBlockDataSource(...)` sa pravim upitima — bez izmene ijednog loadera.

## 6.4 `always` sekcije: compat sada, normalizacija posebno

Inventar (6.1) pokazuje da theme-2, theme-5 i theme-7 renderuju neke CMS sekcije
uprkos `enabled: false`. Primarni invariant T2A je **isti proizvod pre i posle**,
pa migracija to ponašanje čuva. Da registry počne da poštuje te flagove, T2A više
ne bi bio extraction nego istovremeno i behavior change.

Ali to nije sposobnost sistema, nego migration debt i tako izgleda u kodu —
odvojen, izbrisiv sloj:

```
NORMALAN CMS BLOK                  LEGACY ALWAYS BLOK (samo tokom T2A)
ThemeDocument presence             Composition Inventory allowlist
        ↓                                   ↓
    ThemeBlock                     LegacyAlwaysThemeBlock
        ↓                                   ↓
     Registry  ←──────── isti ─────────→ Registry
        ↓                                   ↓
  server loader  ←────── isti ───────→ server loader
        ↓                                   ↓
    renderer   ←──────── isti ─────────→ renderer
```

Compat postoji na obe putanje — renderovanja (`LegacyAlwaysThemeBlock`) i
podataka (`theme-render.ts` dodaje blok koji dokument nema). Bez druge bi
bezuslovna sekcija bila prisutna, ali prazna.

Allowlist se **ne piše ručno**: izvodi se iz `unconditionalCmsBlocks(theme)`.
Kada tema počne da poštuje flag, inventar se menja i compat nestaje sam.

**Acceptance criterion (T2A.4):** legacy composition compatibility ne sme biti
deo `@panta/theme-engine` niti FeatureBlockRegistry domena;
`LegacyAlwaysThemeBlock` sme da renderuje samo par `theme` + `source` koji
Composition Inventory eksplicitno označava kao `always`.

Granicu čuva test (`registry.test.ts` → „granica: domen ne zna za legacy
kompoziciju") koji skenira `types.ts`, `registry.ts`, `definitions.ts`,
`resolve.ts` i ceo engine paket na pojmove kompozicije (`legacy`,
`unconditional`, `theme-N`, stari CMS flagovi). Kompatibilnost sme da živi samo u
`legacy-always.ts`, `theme-render.ts` i `LegacyAlwaysThemeBlock` — što znači da
se briše bez diranja domena.

### T2A-FOLLOWUP — CMS Visibility Semantics Normalization

Zaseban posao **posle svih osam migracija**, ne u istom slice-u. Za svaki
pogođeni tenant se popuni matrica:

| tenant | tema | sekcija | sačuvan `enabled` | današnja vidljivost | željena | odluka |
|---|---|---|---|---|---|---|

Pošto je broj produkcionih tenanta mali, ovo je produkt odluka po tenantu, ne
generička migracija. Dva legitimna ishoda:

- `false` je **stale podatak** → pre normalizacije se postavi `enabled: true`,
  tema pređe na normalni gating; vizuelno nema promene, ali toggle od tada radi;
- `false` je **stvarna namera vlasnice** → uključi se gating i sekcija nestaje —
  ali kao svesno odobrena promena, ne kao slučajna posledica refaktora.

Tek tada se brišu `legacy-always.ts`, `theme-render.ts` i
`LegacyAlwaysThemeBlock`, a pozivi postaju obični `<ThemeBlock>`.

#### Rešeni slučajevi

| tenant | tema | sekcija | sačuvan `enabled` | pre | odluka | datum |
|---|---|---|---|---|---|---|
| Shi Sham | theme-2 | `testimonials` | `false` | prikazivala se prazna (samo naslov) | **poštuj flag** — sekcija nestaje | 2026-08-17 |

Prvi slučaj je rešen ranije nego što je plan predviđao, jer ga je vlasnik sam
prijavio: sekcija je u CMS-u isključena („Landing / Preporuke"), a na sajtu se
ipak prikazivala — i to prazna, bez podataka i bez fallback-a. Odluka je da
`enabled: false` bude ispoštovan, pa `testimonials` više nije bezuslovna sekcija
theme-2 (`honoredFlags` dobija `testimonialsEnabled`, compat poziv postaje običan
`<ThemeBlock>`).

Uz to je `Theme2Testimonials` dobio guard za prazan spisak — sekcija koja je
uključena, a nema nijedan utisak, više ne renderuje sam naslov. (Alternativa koja
je razmatrana — prikaži tek ako ima više od 3 utiska — odbačena je jer bi bila
nevidljivo pravilo koje vlasnik ne može ni da vidi ni da kontroliše, dok toggle
sada radi.)

Preostali `always` slučajevi za normalizaciju: theme-2 `hero`/`about`/
`servicesPreview`, theme-5 (5 sekcija), theme-7 `appointmentSection`.

## 6.5 Theme-native podaci: zabrana pozajmljivanja iz bloka

Prva migracija (Theme1) je namerno **dva sveta**, i to se vidi u kodu:

```
CMS/business sekcije → <ThemeBlock …>   registry → server loader → renderer
theme-native sekcije → zatečeni propovi (tenantStats, services, ls)
```

**Pravilo (zaključano pre migracije):** theme-native element nikada ne pozajmljuje
podatke iz razrešenog Feature Block-a samo zato što oba trenutno koriste isti
domen.

Konkretno: `Theme1PricingSection` danas dobija `services` **bezuslovno**, dok
`services.catalog` blok postoji samo kad je `servicesPreview` uključen. Vezivanje
bi napravilo dve greške odjednom — pricing bi nestao kad se ugasi tuđa sekcija, i
native prezentacija bi zavisila od prisustva druge UI sekcije umesto od podatka
koji joj treba. Isto važi za `Theme1SocialProof` → `tenantStats`.

Native domenski propovi se izdvajaju **tek posle zelene Theme1 regresije**, kao
zaseban korak, i to ne kroz registry nego kroz presentation view-modele:

```
preloaded application data → theme native-data adapter → view model → komponenta
```

Cilj granice:

| | Feature block data | Theme-native data |
|---|---|---|
| šta je | podatak konfigurabilnog business/content bloka | minimalni view-model konkretne teme |
| izvor | može biti isti (request-scoped/preloaded) | isti |
| vlasništvo | registry | tema |

Time nijedna tema ne ostaje na `IService`/`TenantStats`, a registry ne postaje
univerzalni data bus.

### Naličje istog pravila: deljeni izvor nije vlasništvo sekcije

Zabrana iznad kaže da native element ne sme da pozajmljuje podatke **od bloka**.
Ne kaže da podatak pripada sekciji u kojoj se danas prikazuje —
[ARCHITECTURAL_RULES.md §3.4](../ARCHITECTURAL_RULES.md):

> Podatak nije vlasništvo sekcije samo zato što ga trenutni dizajn prikazuje u
> toj sekciji. Deljeni izvor može koristiti više nezavisnih blokova; kompozicija
> određuje gde se podatak prikazuje.

Konkretno za `tenantStats()`:

```
             tenantStats()          ne:  About → SocialProof
              /    |    \                Testimonials → About
         About   Proof   Testimonials    Hero → Testimonials
```

Svaki blok ga traži sam, iz istog memoizovanog izvora. Zato `theme-2` sme da
prikaže metrike u about sekciji, a `theme-1` u zasebnoj native sekciji, bez
ikakve veze između te dve.

**Namerno se NE standardizuje „social proof" kao jedna sekcija ni jedan tip
bloka.** To je pre svega presentation/composition koncept, a oblik dokaza se
razlikuje po vertikali: salonu su dokaz broj klijenata i završenih termina,
edukatoru mogu biti sertifikati, broj obučenih salona, stručne saradnje ili
rezultati edukacija. Sertifikat nije metrika, referenca nije metrika — pa bi
zajednički `SocialProof { clientCount, appointmentCount, … }` pukao već na prvoj
education vertikali.

Ako se obrazac kasnije zaista ponovi, razmatra se nešto generičnije (proof
signals kao unija: metrika / utisak / kredencijal / studija slučaja / saradnja),
a tema bira gde ih raspoređuje. Do tada — bez apstrakcije; prvi stvarni education
zahtev je ulazni materijal, ne pretpostavka.

## 6.6 Theme1 regresija — rezultat (2026-08-17)

Mereno nad stvarnim tenantom `marysoll-makeup-nails` (theme-1, custom domen
`marysoll.makeup`), produkcioni build, `2950d72` (pre) vs `704d56f` (posle).
Stanje „pre" je podignuto kao zaseban `git worktree` da tvrdnja ne bi zavisila
od mešanog radnog stabla.

**DOM: bajt-u-bajt identičan.** Posle uklanjanja skripti i normalizacije triju
volatilnih vrednosti (hash chunk-ova, `$ACTION_KEY`, Server Action id) obe
verzije daju istih 67 657 bajtova markupa.

| | pre | posle | delta |
|---|---|---|---|
| DOM (bez skripti) | 67 657 B | 67 657 B | **0** |
| cela strana | 100 265 B | 104 501 B | +4 236 B |
| cela strana, gzip | 23 417 B | 23 904 B | **+487 B (+2,1 %)** |

Rast je isključivo u RSC payload-u: `ThemeDocument` (8 sekcija) + omotači
razrešenih blokova. Podaci se ne dupliraju — `preloadedBlockDataSource` prosleđuje
iste reference (`services`, `testimonials`, `landingStructure`), pa ih flight
serijalizuje jednom. Trošak će se smanjiti u koraku 6, kada `ThemeLandingProps`
ispusti stare domenske propove.

**TTFB: bez promene.** 40 naizmeničnih parova zahteva (oba servera paralelno, da
se poništi drift):

| | median | p90 |
|---|---|---|
| pre | 121,6 ms | 129,1 ms |
| posle | 119,8 ms | 129,5 ms |

Razlika po paru: median −0,6 ms, sredina +0,0 ms, sd 10,3 ms — čist šum. Očekivano,
jer `resolveThemeBlockData` ne pokreće nijedan nov upit.

Pošto je DOM identičan, sve klijentsko (slike, redosled, layout shift) je
nepromenjeno po konstrukciji; LCP može da se razlikuje samo za onih +487 B
transfera.

> **Metodološka napomena:** prvi pokušaj poređenja bio je pogrešan dva puta —
> `git checkout HEAD~1 -- src` ostavlja nove fajlove na disku (mešano stablo, build
> pukne), a u produkcionom modu `localhost/<slug>` ne rutira na tenanta nego vraća
> 404, pa se merilo vreme 404 strane. Ispravno: worktree + `Host:` header
> tenantovog domena. Isto važi za svaku sledeću temu.

## 6.7 Jedan koncept = jedan blok, više izgleda = varijante

**Pravilo:** jedan business/content koncept je **jedan blok** u `ThemeDocument`-u.
Više mogućih izgleda su **varijante tog bloka**, nikada duplirani blokovi iste
semantike.

Konfiguracija varijante je **enum, ne skup boolean-a**:

```ts
presentationVariant: "cards"        // tačno jedna varijanta je aktivna
// a ne:
showCards: true, showEditorial: false   // dopušta i "obe" i "nijednu"
```

Izraz *flag* se izbegava u persistence/domain kontraktu (u admin UI-ju sme, ako je
korisniku jasnije). `content.gallery` je zatečeni primer istog obrasca pod starim
imenom `galleryVariant`.

Za buduću Education vertikalu to znači:

```
education.catalog
    ├── cards
    ├── editorial
    ├── compact
    └── custom-marina
```

a ne četiri različita education bloka samo zato što izgledaju drugačije.

**Ako tema traži prikaz koji već postoji u drugoj temi:** ako je komponenta
stvarno generička i nema zavisnost od shell-a te druge teme, izvlači se kao
deljeni presentation renderer; ako je snažno vezana za dizajn druge teme, bolje je
napraviti lokalnu varijantu nego uvući pola tuđeg styling sistema.

Podela odgovornosti: **blok bira sadržaj i poslovnu sposobnost; tema + varijanta
biraju kako to izgleda.**

### Prvi slučaj: theme-2 utisci

Zatečeno stanje: `Theme2Landing` je renderovao **dva** prikaza utisaka —
`Theme2Testimonials` (l. 148, bez guarda za prazan spisak) i, posle CTA sekcije,
`Theme2TestimonialsSection` (l. 153, sa `if (!testimonials.length) return null`).

Provera nad produkcijom: Shi Sham ima **0 odobrenih utisaka**, pa se danas vidi
samo prvi — kao prazna sekcija sa naslovom „Utisci klijenata". Drugi ne renderuje
ništa.

Odluka: `content.testimonials` je jedan blok sa `presentationVariant`;
produkcijski prikaz (`cards`) je podrazumevan za theme-2, a `highlights` ostaje
dostupan kao varijanta istog bloka — ne kao druga sekcija.

> **Posledica koju treba znati:** u stanju koje danas ne postoji (tenant na
> theme-2 sa bar jednim odobrenim utiskom) stari kod bi prikazao dve sekcije
> utisaka, novi prikazuje jednu. Za sve stvarne tenante DOM je nepromenjen.

## 6.8 Theme2 regresija — rezultat (2026-08-17)

Shi Sham (`shisham-frizerski-salon`, theme-2), produkcioni build, `39faebd` (pre)
vs radno stablo (posle), worktree + `Host:` subdomen.

| | pre | posle | delta |
|---|---|---|---|
| `<body>` | 35 533 B | 35 533 B | **0 — bajt-u-bajt** |
| `<head>` | 5 016 B | 5 122 B | +106 B (jedan `<link rel="preload">` više) |
| cela strana, gzip | 15 195 B | 15 236 B | +41 B (+0,3 %) |

Razlika u `<head>`-u je posledica izmenjenog chunk grafa (nova `blocks.tsx` /
`blockProps.ts`), ne sadržaja. Uklanjanje druge sekcije utisaka nije promenilo
ništa u DOM-u, jer je kod ovog tenanta ionako renderovala `null`.

TTFB, 40 naizmeničnih parova: median 117,5 → 118,2 ms; razlika po paru median
+0,2 ms, sredina +0,4 ms, sd 13,0 ms — šum.

> Merenje važi za stanje na dan migracije. Odmah posle njega je, po odluci
> vlasnika, sekcija utisaka normalizovana (6.4) i boje zaključane (6.9), pa se
> DOM Shi Sham-a **namerno** razlikuje od gornjeg snimka: sekcija manje (8 → 7).

## 6.9 Zaključane boje u tamnim temama (otvoreno pitanje)

Brend boje su per-tenant, a teme pretpostavljaju da su upotrebljive na svojoj
pozadini. Ta pretpostavka ne važi: Shi Sham ima `primaryColor: #000000`, pa je na
theme-2 (`bg-black`) svaki `text-(--primary-color)` bio nevidljiv.

Zaključano do sada (theme-2 je tamna tema i klijent tu ne može pouzdano da uskladi
boje):

| mesto | bilo | sada | zašto |
|---|---|---|---|
| about eyebrow „O meni" | `--primary-color` | `text-yellow-400` | crno na crnom |
| about statistika (brojevi) | `--primary-color` | `text-yellow-400` | crno na crnom |
| booking koraci (ikonice) | `--primary-color` | `text-black` | pozadina sekcije je bela |

Booking sekcija je deljena sa theme-1; oba današnja tenanta imaju
`primaryColor: #000000`, pa je promena vizuelno neprimetna, a štiti od svetlog
brend primary-ja.

**Otvoreno:** treba definisati gde brend boje uopšte smeju da se koriste i na
kojim temama — od „tema u potpunosti zaključava brend paletu" do „kontrast guard
koji sam bira čitljivu varijantu". Ovo NIJE deo T2A; zapisano da se ad-hoc
popravke ne pomešaju sa pravilom.

## 7. Redosled (T2A)

1. ✅ `packages/theme-engine` — tipovi (`ThemeDocument`, `LayoutDefinition`) +
   validatori (slot/lifecycle/version/schemaVersion) + publish invarijante,
   **nula React/Mongoose/Next zavisnosti** (isti obrazac kao `@panta/diagnostic-engine`).
2. ✅ Adapter `lib/platform/theme-client.ts`: `LandingStructure → ThemeDocument`,
   uz regresiju nad snimkom stvarnih tenanta.
3. ✅ **T2A.3 Composition Inventory** (`lib/platform/theme-composition.ts`) —
   cms-block / theme-native / shell po temi, provereno protiv koda tema (6.1).
4. ✅ **T2A.4 `FeatureBlockRegistry`** (`lib/platform/blocks/`) — registracija,
   schema, server loader, renderer binding kroz `<ThemeBlockScope>`, capability
   placeholder (T2B), request dedupe, plus izbrisiv compat sloj za `always`
   sekcije (6.3/6.4). Nijedna tema još nije dirana.
5. Migracija tema jedne po jedne kroz `<ThemeBlock>` (Theme1 prva jer najviše
   meša CMS i non-CMS sekcije; Theme8 poslednja zbog shell slojeva), uz vizuelnu
   i LCP regresiju po temi. Stari put ostaje živ dok prva tema ne prođe.
   - ✅ **Theme1** (`visibility: "theme-document"`): 7 CMS sekcija ide kroz
     blokove, theme-native ostaje na zatečenim propovima (6.5). Regresija
     prošla — DOM identičan, TTFB nepromenjen (6.6).
   - ✅ **Theme2** — prvi test compat sloja: hero/about/servicesPreview/
     testimonials idu kroz `<LegacyAlwaysThemeBlock>`, gallery/booking kroz
     `<ThemeBlock>`. Uveden model varijanti prikaza (6.7). Regresija prošla —
     `<body>` identičan, TTFB nepromenjen (6.8).
   - ⏳ theme-3…theme-8 — i dalje `visibility: "legacy-flags"`.
6. Tek kada prva tema prođe regresiju, `ThemeLandingProps` počinje da se svodi na:
   `document`, `brandingVars`, `resolveHref`, `reduceMotion`, `headerProps`,
   `footerProps`. **Nijedan stari flag se ne uklanja pre toga.**

## 8. Acceptance criteria

- [ ] Postojeći salon bez education capability izgleda i ponaša se **identično** kao pre.
- [ ] `packages/theme-engine` nema import `Service`, `Appointment`, `Campaign`,
      `mongoose`, `react`, `next`.
- [ ] Nijedna tema ne sadrži `if (tenant.type === …)` ni vertikalno granjanje.
- [ ] Novi feature blok se dodaje **bez ijedne izmene** u `packages/theme-engine`.
- [ ] Nepoznat `type` bloka: render = skip + telemetry, **publish = error**.
- [ ] `slot` se validira protiv `LayoutDefinition` — nepostojeći slot je greška.
- [ ] `published`/`archived` revizije su immutable; `publish` je atomska zamena.
- [ ] `lifecycle` prelazi i monotonost `version`-a su validirani u paketu i
      pokriveni testovima.
- [ ] Prvi render strane nema po-blok klijentski waterfall — loaderi se izvršavaju
      paralelno na serveru sa request dedupe-om.
- [ ] Sve postojeće teme prolaze vizuelnu **i performansnu** regresiju (LCP) na
      demo tenantima.
- [ ] Svaki `always` cms-block iz inventara (6.1) je svesno rešen po temi —
      nijedna tema tiho ne počne/prestane da poštuje CMS flag.
- [x] Legacy composition compatibility nije deo `@panta/theme-engine` ni
      FeatureBlockRegistry domena; `LegacyAlwaysThemeBlock` renderuje samo par
      `theme` + `source` koji Composition Inventory označava kao `always` (6.4).
- [ ] Composition inventar se proverava protiv koda tema (test pada ako tema
      doda ili ukloni flag, a inventar ostane isti).
- [ ] Nijedan theme-native element nije pretvoren u Feature Block bez odluke.

## 9. Non-goals za T2A — disciplina slice-a

T2A je **čist architectural extraction**. U njemu nema:

- Education domena ni ijednog education bloka,
- Distribution/Offer/Campaign koda,
- novog UI-ja, novog CMS ekrana ni redizajna,
- capability resolvera (to je T2B; blokovi za sada dobijaju `capability: null`
  ili postojeći plan gate),
- CDN/edge distribucije theme JSON-a (Faza 4 sazrevanja engine-a).

**Apsolutni zahtev:**

> Pre T2A i posle T2A postojeći tenant mora korisniku izgledati kao **isti
> proizvod** — isti raspored, isti tekst, iste slike, isto ponašanje, ista
> brzina.

To je jedini dokaz da je nastala granica, a ne novi rewrite.

## 10. Izlazni gate: review koda protiv dokumenta

Po završetku T2A radi se **kratak review stvarnog koda protiv ovog dokumenta**
(granica, zavisnosti paketa, registry, loaderi, invarijante). T2B kreće tek ako
granica u kodu izgleda onako kako je ovde definisana — plus odvojena staging baza
kao zaseban prerequisite (vidi [T2B 6.1](PANTA-TENANT-VERTICALS-CAPABILITIES.md)).

## Reference

- [Product Engines vizija](../ARHITEKTURA-ENGINES.md)
- [Tenant verticals & capabilities](PANTA-TENANT-VERTICALS-CAPABILITIES.md)
- [Education vertikala](PANTA-EDUCATION-VERTICAL.md)
- [Branching strategija](PANTA-BRANCHING-STRATEGY.md)
